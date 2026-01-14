// API Base URL
const API_BASE = 'http://localhost:3000/api';

// Current search parameters (for export)
let currentSearchParams = null;
let currentSearchType = null;

// Pagination
let currentPage = 1;
let pageSize = 100;
let totalResults = 0;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupEnterKeyListeners();
    setupInactiveFilter();
});

// Setup tabs
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            
            // Remove active class from all tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Add active class to clicked tab
            button.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });
}

// Setup Enter key listeners
function setupEnterKeyListeners() {
    document.getElementById('freeTextSearch').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchFreeText();
    });
}

// Setup inactive filter toggle
function setupInactiveFilter() {
    const checkbox = document.getElementById('filterInactive');
    const minDaysInput = document.getElementById('minDays');
    const maxDaysInput = document.getElementById('maxDays');
    
    checkbox.addEventListener('change', (e) => {
        minDaysInput.disabled = !e.target.checked;
        maxDaysInput.disabled = !e.target.checked;
        if (!e.target.checked) {
            minDaysInput.value = '90';
            maxDaysInput.value = '';
        }
    });
}

// Show/hide loading
function showLoading(show = true) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

// Show error
function showError(message) {
    alert(`❌ Error: ${message}`);
}

// Free text search
async function searchFreeText(resetPage = true) {
    const searchText = document.getElementById('freeTextSearch').value.trim();
    
    if (!searchText) {
        showError('Por favor ingresa un texto de búsqueda');
        return;
    }

    if (resetPage) {
        currentPage = 1;
    }

    const onlyInactive = document.getElementById('onlyInactive').checked;
    
    const params = {
        searchText,
        ...(onlyInactive && { minDaysSinceLastPurchase: 90 }),
        from: (currentPage - 1) * pageSize,
        size: pageSize
    };

    currentSearchParams = params;
    currentSearchType = 'free-text';

    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE}/customers/free-text-search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            throw new Error('Error en la búsqueda');
        }

        const data = await response.json();
        displayResults(data);
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Advanced search
async function searchAdvanced(resetPage = true) {
    if (resetPage) {
        currentPage = 1;
    }

    const params = {
        from: (currentPage - 1) * pageSize,
        size: pageSize
    };

    // Get form values
    const gender = document.getElementById('gender').value;
    const city = document.getElementById('city').value;
    const companyId = document.getElementById('companyId').value;
    const segment = document.getElementById('segment').value;
    const filterInactive = document.getElementById('filterInactive').checked;
    const minDays = parseInt(document.getElementById('minDays').value);
    const maxDays = parseInt(document.getElementById('maxDays').value);
    const minSpent = parseFloat(document.getElementById('minSpent').value);
    const ingredients = document.getElementById('ingredients').value;
    const products = document.getElementById('products').value;

    // Build params
    if (gender) params.gender = gender;
    if (city) params.city = city;
    if (companyId) params.companyId = companyId;
    if (segment) params.customerSegment = segment;
    if (filterInactive) {
        if (minDays) params.minDaysSinceLastPurchase = minDays;
        if (maxDays) params.maxDaysSinceLastPurchase = maxDays;
    }
    if (minSpent) params.minTotalSpent = minSpent;
    
    if (ingredients) {
        params.ingredients = ingredients.split(',').map(i => i.trim()).filter(i => i);
    }
    
    if (products) {
        params.products = products.split(',').map(p => p.trim()).filter(p => p);
    }

    currentSearchParams = params;
    currentSearchType = 'advanced';

    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE}/customers/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            throw new Error('Error en la búsqueda');
        }

        const data = await response.json();
        displayResults(data);
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Display results
function displayResults(data) {
    const resultsSection = document.getElementById('resultsSection');
    const resultsBody = document.getElementById('resultsBody');
    const resultsCount = document.getElementById('resultsCount');
    const resultsTime = document.getElementById('resultsTime');

    // Update pagination info
    totalResults = data.total;
    updatePaginationControls();

    // Update header
    const startResult = (currentPage - 1) * pageSize + 1;
    const endResult = Math.min(currentPage * pageSize, totalResults);
    resultsCount.textContent = `${startResult}-${endResult} de ${totalResults.toLocaleString()} clientes`;
    resultsTime.textContent = `(${data.took}ms)`;

    // Clear previous results
    resultsBody.innerHTML = '';

    // Add rows
    if (data.customers.length === 0) {
        resultsBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center">No se encontraron clientes</td>
            </tr>
        `;
    } else {
        data.customers.forEach(customer => {
            const row = document.createElement('tr');
            
            // Determine status color
            let statusClass = 'status-normal';
            if (customer.days_since_last_purchase > 180) {
                statusClass = 'status-critical';
            } else if (customer.days_since_last_purchase > 120) {
                statusClass = 'status-warning';
            }

            row.innerHTML = `
                <td><strong>${customer.name}</strong><br><small>${customer.gender}</small></td>
                <td>${customer.phone}</td>
                <td>${customer.email || 'N/A'}</td>
                <td>${customer.city}</td>
                <td class="${statusClass}">${customer.days_since_last_purchase} días</td>
                <td>$${customer.total_spent ? customer.total_spent.toFixed(2) : '0.00'}</td>
                <td>${customer.total_purchases || 0}</td>
                <td><small>${(customer.favorite_products || []).slice(0, 2).join(', ')}</small></td>
                <td><small>${(customer.favorite_ingredients || []).slice(0, 3).join(', ')}</small></td>
            `;
            
            resultsBody.appendChild(row);
        });
    }

    // Show results section
    resultsSection.style.display = 'block';
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Load statistics
async function loadStats() {
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE}/customers/inactive-stats`);
        
        if (!response.ok) {
            throw new Error('Error cargando estadísticas');
        }

        const data = await response.json();
        displayStats(data);
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Display statistics
function displayStats(data) {
    const statsContent = document.getElementById('statsContent');
    
    const html = `
        <div class="stats-grid">
            <div class="stat-card">
                <h4>Total Clientes Inactivos</h4>
                <div class="stat-value">${data.total.toLocaleString()}</div>
            </div>

            <div class="stat-card">
                <h4>Promedio Gasto</h4>
                <div class="stat-value">$${data.aggregations.total_spent_stats.avg.toFixed(2)}</div>
            </div>

            <div class="stat-card">
                <h4>Gasto Total Perdido</h4>
                <div class="stat-value">$${data.aggregations.total_spent_stats.sum.toLocaleString('en-US', {maximumFractionDigits: 0})}</div>
            </div>

            <div class="stat-card">
                <h4>Distribución por Género</h4>
                <ul class="stat-list">
                    ${data.aggregations.by_gender.buckets.map(b => `
                        <li>
                            <span>${b.key}</span>
                            <strong>${b.doc_count.toLocaleString()}</strong>
                        </li>
                    `).join('')}
                </ul>
            </div>

            <div class="stat-card">
                <h4>Top 5 Ciudades</h4>
                <ul class="stat-list">
                    ${data.aggregations.by_city.buckets.slice(0, 5).map(b => `
                        <li>
                            <span>${b.key}</span>
                            <strong>${b.doc_count.toLocaleString()}</strong>
                        </li>
                    `).join('')}
                </ul>
            </div>

            <div class="stat-card">
                <h4>Top 5 Productos</h4>
                <ul class="stat-list">
                    ${data.aggregations.top_favorite_products.buckets.slice(0, 5).map(b => `
                        <li>
                            <span>${b.key}</span>
                            <strong>${b.doc_count.toLocaleString()}</strong>
                        </li>
                    `).join('')}
                </ul>
            </div>

            <div class="stat-card">
                <h4>Top 5 Ingredientes</h4>
                <ul class="stat-list">
                    ${data.aggregations.top_favorite_ingredients.buckets.slice(0, 5).map(b => `
                        <li>
                            <span>${b.key}</span>
                            <strong>${b.doc_count.toLocaleString()}</strong>
                        </li>
                    `).join('')}
                </ul>
            </div>

            <div class="stat-card">
                <h4>Por Segmento</h4>
                <ul class="stat-list">
                    ${data.aggregations.by_segment.buckets.map(b => `
                        <li>
                            <span>${b.key}</span>
                            <strong>${b.doc_count.toLocaleString()}</strong>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `;
    
    statsContent.innerHTML = html;
}

// Pagination functions
function updatePaginationControls() {
    const totalPages = Math.ceil(totalResults / pageSize);
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage >= totalPages;
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        if (currentSearchType === 'free-text') {
            searchFreeText(false);
        } else {
            searchAdvanced(false);
        }
    }
}

function nextPage() {
    const totalPages = Math.ceil(totalResults / pageSize);
    if (currentPage < totalPages) {
        currentPage++;
        if (currentSearchType === 'free-text') {
            searchFreeText(false);
        } else {
            searchAdvanced(false);
        }
    }
}

// Export to Excel
async function exportToExcel() {
    if (!currentSearchParams || !currentSearchType) {
        showError('Primero realiza una búsqueda');
        return;
    }

    try {
        showLoading(true);

        const endpoint = currentSearchType === 'free-text' 
            ? `${API_BASE}/customers/export`
            : `${API_BASE}/customers/export`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(currentSearchParams)
        });

        if (!response.ok) {
            throw new Error('Error exportando a Excel');
        }

        // Download file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clientes_inactivos_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        alert('✅ Excel descargado exitosamente');
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Pagination functions
function updatePaginationControls() {
    const totalPages = Math.ceil(totalResults / pageSize);
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage >= totalPages;
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        if (currentSearchType === 'free-text') {
            searchFreeText(false);
        } else {
            searchAdvanced(false);
        }
    }
}

function nextPage() {
    const totalPages = Math.ceil(totalResults / pageSize);
    if (currentPage < totalPages) {
        currentPage++;
        if (currentSearchType === 'free-text') {
            searchFreeText(false);
        } else {
            searchAdvanced(false);
        }
    }
}

// Clear advanced filters
function clearAdvancedFilters() {
    document.getElementById('gender').value = '';
    document.getElementById('city').value = '';
    document.getElementById('companyId').value = '';
    document.getElementById('segment').value = '';
    document.getElementById('filterInactive').checked = false;
    document.getElementById('minDays').value = '90';
    document.getElementById('minDays').disabled = true;
    document.getElementById('maxDays').value = '';
    document.getElementById('maxDays').disabled = true;
    document.getElementById('minSpent').value = '';
    document.getElementById('ingredients').value = '';
    document.getElementById('products').value = '';
}
