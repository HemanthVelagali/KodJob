const API_KEY = '157ea018fb5d3790da8ff87e75303a4a720cff44f82575897fcac11b0f278534';
const jobsContainer = document.getElementById('jobsContainer');
const loadingSpinner = document.getElementById('loadingSpinner');
const searchInput = document.getElementById('searchInput');

async function fetchJobs() {
    try {
        const response = await fetch(`https://www.themuse.com/api/public/jobs?page=1&api_key=${API_KEY}`);
        const data = await response.json();
        return data.results;
    } catch (error) {
        console.error('Error fetching jobs:', error);
        return [];
    }
}

async function tryFetchLogo(companyName) {
    // Array of logo service URLs to try
    const logoServices = [
        // Clearbit with different domains
        (name) => `https://logo.clearbit.com/${name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '')}.com`,
        (name) => `https://logo.clearbit.com/${name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '')}.io`,
        // Company logos from other services
        (name) => `https://api.brandfetch.io/v2/brands/${name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '')}/logo`,
        (name) => `https://logo.uplead.com/${name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '')}.com`,
        // Add fallback to generic company logos
        (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=150`
    ];

    // Try each service until we find a working logo
    for (const getLogoUrl of logoServices) {
        try {
            const url = getLogoUrl(companyName);
            const response = await fetch(url, { method: 'HEAD' });
            if (response.ok) {
                return url;
            }
        } catch (e) {
            continue;
        }
    }

    // If all services fail, return null
    return null;
}

async function createJobCard(job) {
    const card = document.createElement('div');
    card.className = 'col-md-4 mb-4';
    
    const companyName = job.company?.name || 'Company Name Not Available';
    const companyInitials = companyName
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'CO';

    // Try to get logo with multiple attempts
    let logoUrl = await tryFetchLogo(companyName);
    
    // If no logo found, use UI Avatars as final fallback
    if (!logoUrl) {
        logoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(companyInitials)}&background=${encodeURIComponent(stringToColor(companyName).substring(1))}&color=fff&size=150`;
    }

    const logoHTML = `
        <div class="company-logo-container">
            <img 
                src="${logoUrl}"
                alt="${companyName}"
                class="company-logo"
                onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(companyInitials)}&background=${encodeURIComponent(stringToColor(companyName).substring(1))}&color=fff&size=150';"
            >
        </div>
    `;

    card.innerHTML = `
        <div class="card job-card shadow-sm">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    ${logoHTML}
                    <span class="badge bg-primary">${job.levels?.[0]?.name || 'Entry Level'}</span>
                </div>
                <h5 class="card-title text-truncate" title="${job.name}">${job.name}</h5>
                <h6 class="card-subtitle mb-2 text-muted">
                    <span class="company-name">${companyName}</span>
                    <br>
                    <span class="location-name">${job.locations?.[0]?.name || 'Remote'}</span>
                </h6>
                <div class="mb-3">
                    ${(job.categories || []).map(category => 
                        `<span class="badge bg-secondary">${category.name}</span>`
                    ).join('')}
                </div>
                <a href="${job.refs.landing_page}" target="_blank" class="apply-btn">
                    Check Details
                </a>
            </div>
        </div>
    `;
    return card;
}

function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
        '#D4A5A5', '#9B59B6', '#3498DB', '#1ABC9C', '#F1C40F'
    ];
    return colors[Math.abs(hash) % colors.length];
}

function filterJobs(jobs, searchTerm) {
    return jobs.filter(job => 
        job.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.locations.some(location => 
            location.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );
}

let allJobs = [];

async function initializeApp() {
    loadingSpinner.style.display = 'block';
    jobsContainer.innerHTML = '';
    
    allJobs = await fetchJobs();
    await displayJobs(allJobs);
    
    loadingSpinner.style.display = 'none';
}

async function displayJobs(jobs) {
    jobsContainer.innerHTML = '';
    for (const job of jobs) {
        const card = await createJobCard(job);
        jobsContainer.appendChild(card);
    }
}

searchInput.addEventListener('input', async (e) => {
    const searchTerm = e.target.value;
    const filteredJobs = filterJobs(allJobs, searchTerm);
    await displayJobs(filteredJobs);
});

// Initialize the app
initializeApp();

// Add error handling for failed API requests
window.addEventListener('unhandledrejection', function(event) {
    loadingSpinner.style.display = 'none';
    jobsContainer.innerHTML = `
        <div class="col-12 text-center">
            <p class="text-danger">Failed to load jobs. Please try again later.</p>
        </div>
    `;
}); 