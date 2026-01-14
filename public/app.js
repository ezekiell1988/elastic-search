// API Base URL - Detecta automáticamente el entorno
const API_BASE = '/api';

// Current search parameters (for export) - separate for each search type
let currentSearchParams = {
    'free-text': null,
    'advanced': null
};

// Pagination - separate for each search type
let pagination = {
    'free-text': { currentPage: 1, pageSize: 100, totalResults: 0 },
    'advanced': { currentPage: 1, pageSize: 100, totalResults: 0 }
};

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
            
            // Auto-load stats when stats tab is activated
            if (tabName === 'stats') {
                loadStats();
            }
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
        pagination['free-text'].currentPage = 1;
    }

    const onlyInactive = document.getElementById('onlyInactive').checked;
    
    const params = {
        searchText,
        ...(onlyInactive && { minDaysSinceLastPurchase: 90 }),
        from: (pagination['free-text'].currentPage - 1) * pagination['free-text'].pageSize,
        size: pagination['free-text'].pageSize
    };

    currentSearchParams['free-text'] = params;

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
        displayResults(data, 'free-text');
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Advanced search
async function searchAdvanced(resetPage = true) {
    if (resetPage) {
        pagination['advanced'].currentPage = 1;
    }

    const params = {
        from: (pagination['advanced'].currentPage - 1) * pagination['advanced'].pageSize,
        size: pagination['advanced'].pageSize
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

    currentSearchParams['advanced'] = params;

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
        displayResults(data, 'advanced');
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Display results
function displayResults(data, searchType) {
    const prefix = searchType === 'free-text' ? 'freeText' : 'advanced';
    const resultsSection = document.getElementById(`${prefix}Results`);
    const resultsBody = document.getElementById(`${prefix}ResultsBody`);
    const resultsCount = document.getElementById(`${prefix}ResultsCount`);
    const resultsTime = document.getElementById(`${prefix}ResultsTime`);

    // Update pagination info
    pagination[searchType].totalResults = data.total;
    updatePaginationControls(searchType);

    // Update header
    const currentPage = pagination[searchType].currentPage;
    const pageSize = pagination[searchType].pageSize;
    const totalResults = pagination[searchType].totalResults;
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
                <td colspan="4" class="text-center">No se encontraron clientes</td>
            </tr>
        `;
    } else {
        data.customers.forEach((customer, index) => {
            // Main row with basic info
            const row = document.createElement('tr');
            row.className = 'customer-row';
            row.style.cursor = 'pointer';
            row.onclick = () => toggleDetails(searchType, index);
            
            row.innerHTML = `
                <td><strong>${customer.name}</strong></td>
                <td>${customer.gender}</td>
                <td>${customer.phone}</td>
                <td>${customer.email || 'N/A'}</td>
            `;
            
            resultsBody.appendChild(row);
            
            // Details row (hidden by default)
            const detailsRow = document.createElement('tr');
            detailsRow.id = `${searchType}-details-${index}`;
            detailsRow.className = 'details-row';
            detailsRow.style.display = 'none';
            
            // Determine status color
            let statusClass = 'status-normal';
            if (customer.days_since_last_purchase > 180) {
                statusClass = 'status-critical';
            } else if (customer.days_since_last_purchase > 120) {
                statusClass = 'status-warning';
            }
            
            detailsRow.innerHTML = `
                <td colspan="4">
                    <div class="customer-details">
                        <div class="detail-grid">
                            <div class="detail-item">
                                <strong>Ciudad:</strong> ${customer.city}
                            </div>
                            <div class="detail-item">
                                <strong>Días sin comprar:</strong> <span class="${statusClass}">${customer.days_since_last_purchase} días</span>
                            </div>
                            <div class="detail-item">
                                <strong>Total gastado:</strong> $${customer.total_spent ? customer.total_spent.toFixed(2) : '0.00'}
                            </div>
                            <div class="detail-item">
                                <strong>Total compras:</strong> ${customer.total_purchases || 0}
                            </div>
                            <div class="detail-item full-width">
                                <strong>Productos favoritos:</strong> ${(customer.favorite_products || []).join(', ') || 'N/A'}
                            </div>
                            <div class="detail-item full-width">
                                <strong>Ingredientes favoritos:</strong> ${(customer.favorite_ingredients || []).join(', ') || 'N/A'}
                            </div>
                        </div>
                    </div>
                </td>
            `;
            
            resultsBody.appendChild(detailsRow);
        });
    }

    // Show results section
    resultsSection.style.display = 'block';
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Toggle customer details
function toggleDetails(searchType, index) {
    const detailsRow = document.getElementById(`${searchType}-details-${index}`);
    if (detailsRow) {
        detailsRow.style.display = detailsRow.style.display === 'none' ? 'table-row' : 'none';
    }
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
function updatePaginationControls(searchType) {
    const prefix = searchType === 'free-text' ? 'freeText' : 'advanced';
    const pag = pagination[searchType];
    const totalPages = Math.ceil(pag.totalResults / pag.pageSize);
    
    // Update both top and bottom pagination controls
    const pageInfoTop = document.getElementById(`${prefix}PageInfoTop`);
    const pageInfo = document.getElementById(`${prefix}PageInfo`);
    const prevBtnTop = document.getElementById(`${prefix}PrevBtnTop`);
    const prevBtn = document.getElementById(`${prefix}PrevBtn`);
    const nextBtnTop = document.getElementById(`${prefix}NextBtnTop`);
    const nextBtn = document.getElementById(`${prefix}NextBtn`);

    const pageText = `Página ${pag.currentPage} de ${totalPages}`;
    if (pageInfoTop) pageInfoTop.textContent = pageText;
    if (pageInfo) pageInfo.textContent = pageText;
    
    const isFirstPage = pag.currentPage === 1;
    const isLastPage = pag.currentPage >= totalPages;
    
    if (prevBtnTop) prevBtnTop.disabled = isFirstPage;
    if (prevBtn) prevBtn.disabled = isFirstPage;
    if (nextBtnTop) nextBtnTop.disabled = isLastPage;
    if (nextBtn) nextBtn.disabled = isLastPage;
    
    // Update page size selectors
    const pageSizeSelector = document.getElementById(`${prefix}PageSize`);
    const pageSizeSelectorBottom = document.getElementById(`${prefix}PageSizeBottom`);
    if (pageSizeSelector) pageSizeSelector.value = pag.pageSize;
    if (pageSizeSelectorBottom) pageSizeSelectorBottom.value = pag.pageSize;
}

function changePageSize(searchType, newSize) {
    pagination[searchType].pageSize = parseInt(newSize);
    pagination[searchType].currentPage = 1; // Reset to first page
    
    // Update both selectors to keep them in sync
    const prefix = searchType === 'free-text' ? 'freeText' : 'advanced';
    const pageSizeSelector = document.getElementById(`${prefix}PageSize`);
    const pageSizeSelectorBottom = document.getElementById(`${prefix}PageSizeBottom`);
    if (pageSizeSelector) pageSizeSelector.value = newSize;
    if (pageSizeSelectorBottom) pageSizeSelectorBottom.value = newSize;
    
    // Re-run the search with new page size
    if (searchType === 'free-text') {
        searchFreeText(false);
    } else {
        searchAdvanced(false);
    }
}

function previousPage(searchType) {
    const pag = pagination[searchType];
    if (pag.currentPage > 1) {
        pag.currentPage--;
        if (searchType === 'free-text') {
            searchFreeText(false);
        } else {
            searchAdvanced(false);
        }
    }
}

function nextPage(searchType) {
    const pag = pagination[searchType];
    const totalPages = Math.ceil(pag.totalResults / pag.pageSize);
    if (pag.currentPage < totalPages) {
        pag.currentPage++;
        if (searchType === 'free-text') {
            searchFreeText(false);
        } else {
            searchAdvanced(false);
        }
    }
}

// Export to Excel
async function exportToExcel(searchType) {
    const params = currentSearchParams[searchType];
    if (!params) {
        showError('Primero realiza una búsqueda');
        return;
    }

    try {
        showLoading(true);

        const endpoint = `${API_BASE}/customers/export`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
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

// Clear advanced filters
function clearAdvancedFilters() {
    document.getElementById('gender').value = '';
    document.getElementById('city').value = '';
    document.getElementById('companyId').value = '';
    document.getElementById('segment').value = '';
    document.getElementById('filterInactive').checked = true;
    document.getElementById('minDays').value = '90';
    document.getElementById('maxDays').value = '';
    document.getElementById('minSpent').value = '';
    document.getElementById('ingredients').value = '';
    document.getElementById('products').value = '';
}
