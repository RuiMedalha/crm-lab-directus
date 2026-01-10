/**
 * HQS Search Results - V7.0
 * - Scroll infinito CORRIGIDO (offset funcional)
 * - Filtros funcionais (categorias, marcas, preço)
 * - Botão adicionar ao carrinho
 */

// Função global para adicionar ao carrinho (WooCommerce AJAX)
window.hqsAddToCart = function(productId, btn) {
    if (!productId) return;
    
    const originalText = btn.textContent;
    btn.textContent = 'A adicionar...';
    btn.disabled = true;
    
    jQuery.ajax({
        url: (typeof wc_add_to_cart_params !== 'undefined') ? wc_add_to_cart_params.ajax_url : '/wp-admin/admin-ajax.php',
        type: 'POST',
        data: {
            action: 'woocommerce_ajax_add_to_cart',
            product_id: productId,
            quantity: 1
        },
        success: function(response) {
            if (response.error) {
                btn.textContent = 'Erro';
                setTimeout(() => { btn.textContent = originalText; btn.disabled = false; }, 2000);
            } else {
                btn.textContent = '✓ Adicionado';
                btn.style.background = '#27ae60';
                jQuery(document.body).trigger('wc_fragment_refresh');
                jQuery(document.body).trigger('added_to_cart');
                setTimeout(() => { 
                    btn.textContent = originalText; 
                    btn.disabled = false; 
                    btn.style.background = '';
                }, 2500);
            }
        },
        error: function() {
            btn.textContent = 'Ver produto';
            const card = btn.closest('.hqs-product-card');
            if (card) {
                const link = card.querySelector('a');
                if (link) window.location.href = link.href + '?add-to-cart=' + productId;
            }
        }
    });
};

jQuery(document).ready(function($) {
    const config = window.hqsData || {};


    // ==== Meili DIRECT config (com fallback) ====
    const meili = {
        host: config.meiliHost ? String(config.meiliHost) : "",
        index: config.meiliIndex ? String(config.meiliIndex) : "",
        key: config.meiliKey ? String(config.meiliKey) : ""
    };

    const canDirectMeili = () => meili.host && meili.index && meili.key;

    const meiliSearch = async (body) => {
        const url =
            meili.host.replace(/\/+$/, "") +
            "/indexes/" +
            encodeURIComponent(meili.index) +
            "/search";

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + meili.key
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) throw new Error("Meili " + res.status);
        return await res.json();
    };

    
    // Estado da aplicação
    const state = {
        query: new URLSearchParams(window.location.search).get('q') || '',
        offset: 0,
        limit: 24,
        isLoading: false,
        hasMore: true,
        totalHits: 0,
        // Filtros ativos
        filters: {
            categories: [],
            brands: [],
            priceMin: null,
            priceMax: null
        },
        // Facets disponíveis
        facets: {
            categories: [],
            brands: [],
            priceRange: null
        }
    };

    // Formatar preço em EUR
    const formatPrice = (price) => {
        const num = parseFloat(price);
        if (!num || num <= 0) return null;
        return new Intl.NumberFormat('pt-PT', { 
            style: 'currency', 
            currency: 'EUR' 
        }).format(num);
    };

    // Escape HTML
    const esc = (str) => {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    };

    // Construir HTML do preço
    const buildPriceHTML = (p) => {
        const price = parseFloat(p.price) || 0;
        const regular = parseFloat(p.regular_price) || 0;
        const sale = parseFloat(p.sale_price) || 0;
        
        if (sale > 0 && regular > 0 && sale < regular) {
            return `
                <span class="hqs-price-current">${formatPrice(sale)}</span>
                <span class="hqs-price-old">${formatPrice(regular)}</span>
            `;
        }
        
        const finalPrice = price > 0 ? price : regular;
        if (finalPrice > 0) {
            return `<span class="hqs-price-current">${formatPrice(finalPrice)}</span>`;
        }
        
        return `<span class="hqs-price-contact">Sob consulta</span>`;
    };

    // Construir HTML do card
    const buildCardHTML = (p) => {
        const link = p.permalink || p.url || '#';
        const productId = p.id || 0;
        const imgUrl = p.image || p.thumbnail || '';
        const title = esc(p.title || '');
        const brand = esc(p.brand || '');
        const desc = esc(p.short_description || '');
        
        const placeholderSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23f4f4f4' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='%23ccc' font-size='10'%3ESem Foto%3C/text%3E%3C/svg%3E";
        
        const imgTag = imgUrl 
            ? `<img src="${imgUrl}" alt="${title}" loading="lazy" onerror="this.src='${placeholderSvg}'">`
            : `<img src="${placeholderSvg}" alt="Sem imagem">`;

        return `
            <article class="hqs-product-card" data-product-id="${productId}">
                <a href="${link}" class="hqs-card-link">
                    <div class="hqs-img-wrap">
                        ${imgTag}
                    </div>
                    <div class="hqs-info">
                        <h3 class="hqs-prod-title">${title}</h3>
                        ${brand ? `<div class="hqs-prod-brand">${brand}</div>` : ''}
                        ${desc ? `<p class="hqs-prod-desc">${desc}</p>` : ''}
                        <div class="hqs-price-box">
                            ${buildPriceHTML(p)}
                            <button type="button" class="hqs-btn-cart" data-product-id="${productId}" onclick="event.preventDefault(); event.stopPropagation(); hqsAddToCart(${productId}, this);">+ Carrinho</button>
                        </div>
                    </div>
                </a>
            </article>
        `;
    };

    // Construir sidebar de filtros
    const buildFiltersHTML = () => {
        let html = '';
        
        // Filtro de Preço com Range Slider
        if (state.facets.priceRange && state.facets.priceRange.min !== null) {
            const min = Math.floor(state.facets.priceRange.min) || 0;
            const max = Math.ceil(state.facets.priceRange.max) || 10000;
            const currentMin = state.filters.priceMin !== null ? state.filters.priceMin : min;
            const currentMax = state.filters.priceMax !== null ? state.filters.priceMax : max;
            
            html += `
                <div class="hqs-filter-group">
                    <h3>Preço, €</h3>
                    <div class="hqs-price-filter">
                        <div class="hqs-range-slider">
                            <div class="hqs-range-track"></div>
                            <div class="hqs-range-selected" id="hqs-range-selected"></div>
                            <input type="range" id="hqs-range-min" min="${min}" max="${max}" value="${currentMin}" step="1">
                            <input type="range" id="hqs-range-max" min="${min}" max="${max}" value="${currentMax}" step="1">
                        </div>
                        <div class="hqs-price-values">
                            <span id="hqs-price-min-val">${formatPrice(currentMin)}</span>
                            <span>—</span>
                            <span id="hqs-price-max-val">${formatPrice(currentMax)}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Filtro de Categorias
        if (state.facets.categories && state.facets.categories.length > 0) {
            html += `
                <div class="hqs-filter-group">
                    <h3>Categorias</h3>
                    <div class="hqs-filter-list" id="hqs-filter-categories">
            `;
            state.facets.categories.slice(0, 15).forEach(cat => {
                const checked = state.filters.categories.includes(cat.name) ? 'checked' : '';
                html += `
                    <label class="hqs-filter-item">
                        <input type="checkbox" value="${esc(cat.name)}" ${checked} data-filter="category">
                        <span class="hqs-filter-name">${esc(cat.name)}</span>
                        <span class="hqs-filter-count">(${cat.count})</span>
                    </label>
                `;
            });
            html += `</div></div>`;
        }
        
        // Filtro de Marcas
        if (state.facets.brands && state.facets.brands.length > 0) {
            html += `
                <div class="hqs-filter-group">
                    <h3>Marca</h3>
                    <div class="hqs-filter-list" id="hqs-filter-brands">
            `;
            state.facets.brands.slice(0, 15).forEach(brand => {
                const checked = state.filters.brands.includes(brand.name) ? 'checked' : '';
                html += `
                    <label class="hqs-filter-item">
                        <input type="checkbox" value="${esc(brand.name)}" ${checked} data-filter="brand">
                        <span class="hqs-filter-name">${esc(brand.name)}</span>
                        <span class="hqs-filter-count">(${brand.count})</span>
                    </label>
                `;
            });
            html += `</div></div>`;
        }
        
        // Botão limpar filtros
        if (state.filters.categories.length > 0 || state.filters.brands.length > 0 || state.filters.priceMin || state.filters.priceMax) {
            html += `
                <div class="hqs-filter-group">
                    <button type="button" class="hqs-btn-clear-filters" id="hqs-clear-filters">Limpar Filtros</button>
                </div>
            `;
        }
        
        return html;
    };

    // UI helpers (mobile filters drawer)
    const ui = {
        isMobile: window.matchMedia && window.matchMedia('(max-width: 768px)').matches
    };

    const setFiltersOpen = (open) => {
        const root = document.documentElement;
        root.classList.toggle('hqs-filters-open', !!open);
        $('#hqs-open-filters').attr('aria-expanded', open ? 'true' : 'false');
    };

    const bindFiltersDrawerEvents = () => {
        // open button
        $('#hqs-open-filters').off('click').on('click', function() {
            if (!ui.isMobile) return;
            setFiltersOpen(true);
        });

        // backdrop close
        $('#hqs-filters-backdrop').off('click').on('click', function() {
            setFiltersOpen(false);
        });

        // esc close
        $(document).off('keydown.hqsFilters').on('keydown.hqsFilters', function(e) {
            if (e.key === 'Escape') setFiltersOpen(false);
        });
    };

    const withMobileSidebarHeader = (innerHtml) => {
        if (!ui.isMobile) return innerHtml;
        return `
            <div class="hqs-sidebar-mobile-bar">
                <div class="hqs-sidebar-mobile-title">Filtros</div>
                <button type="button" class="hqs-sidebar-close" id="hqs-close-filters" aria-label="Fechar">&times;</button>
            </div>
            ${innerHtml}
        `;
    };

    // Atualizar sidebar
    const updateSidebar = () => {
        ui.isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
        const sidebar = $('#hqs-sidebar');
        const hasFacets = (state.facets.categories && state.facets.categories.length > 0) || (state.facets.brands && state.facets.brands.length > 0) || !!state.facets.priceRange;

        if (hasFacets) {
            sidebar.html(withMobileSidebarHeader(buildFiltersHTML()));
            if (!ui.isMobile) sidebar.show();
            bindFilterEvents();
            bindFiltersDrawerEvents();

            // show "Filtros" button (mobile only)
            if (ui.isMobile) $('#hqs-open-filters').css('display', 'inline-flex');
            else $('#hqs-open-filters').hide();

            // mobile close button
            $('#hqs-close-filters').off('click').on('click', function() {
                setFiltersOpen(false);
            });
        } else {
            sidebar.empty();
            if (!ui.isMobile) sidebar.hide();
            $('#hqs-open-filters').hide();
            setFiltersOpen(false);
        }
    };

    // Bind eventos dos filtros
    const bindFilterEvents = () => {
        // Checkboxes de categoria
        $('#hqs-filter-categories input[type="checkbox"]').off('change').on('change', function() {
            const value = $(this).val();
            if ($(this).is(':checked')) {
                if (!state.filters.categories.includes(value)) {
                    state.filters.categories.push(value);
                }
            } else {
                state.filters.categories = state.filters.categories.filter(c => c !== value);
            }
            resetAndSearch();
        });
        
        // Checkboxes de marca
        $('#hqs-filter-brands input[type="checkbox"]').off('change').on('change', function() {
            const value = $(this).val();
            if ($(this).is(':checked')) {
                if (!state.filters.brands.includes(value)) {
                    state.filters.brands.push(value);
                }
            } else {
                state.filters.brands = state.filters.brands.filter(b => b !== value);
            }
            resetAndSearch();
        });
        
        // Range Slider de preço
        const rangeMin = document.getElementById('hqs-range-min');
        const rangeMax = document.getElementById('hqs-range-max');
        const rangeSelected = document.getElementById('hqs-range-selected');
        const priceMinVal = document.getElementById('hqs-price-min-val');
        const priceMaxVal = document.getElementById('hqs-price-max-val');
        
        if (rangeMin && rangeMax) {
            let priceTimeout;
            
            const updateSlider = () => {
                const min = parseInt(rangeMin.min);
                const max = parseInt(rangeMin.max);
                const minVal = parseInt(rangeMin.value);
                const maxVal = parseInt(rangeMax.value);
                
                // Impedir que se cruzem
                if (minVal > maxVal - 10) {
                    rangeMin.value = maxVal - 10;
                    return;
                }
                if (maxVal < minVal + 10) {
                    rangeMax.value = minVal + 10;
                    return;
                }
                
                // Atualizar visual
                const percentMin = ((minVal - min) / (max - min)) * 100;
                const percentMax = ((maxVal - min) / (max - min)) * 100;
                
                if (rangeSelected) {
                    rangeSelected.style.left = percentMin + '%';
                    rangeSelected.style.width = (percentMax - percentMin) + '%';
                }
                
                // Atualizar valores mostrados
                if (priceMinVal) priceMinVal.textContent = formatPrice(minVal);
                if (priceMaxVal) priceMaxVal.textContent = formatPrice(maxVal);
            };
            
            const applyPriceFilter = () => {
                clearTimeout(priceTimeout);
                priceTimeout = setTimeout(() => {
                    const minVal = parseInt(rangeMin.value);
                    const maxVal = parseInt(rangeMax.value);
                    const min = parseInt(rangeMin.min);
                    const max = parseInt(rangeMin.max);
                    
                    // Só aplicar filtro se diferente dos limites
                    state.filters.priceMin = (minVal > min) ? minVal : null;
                    state.filters.priceMax = (maxVal < max) ? maxVal : null;
                    
                    resetAndSearch();
                }, 500);
            };
            
            rangeMin.addEventListener('input', () => { updateSlider(); });
            rangeMax.addEventListener('input', () => { updateSlider(); });
            rangeMin.addEventListener('change', applyPriceFilter);
            rangeMax.addEventListener('change', applyPriceFilter);
            
            // Inicializar visual
            updateSlider();
        }
        
        // Botão limpar filtros
        $('#hqs-clear-filters').off('click').on('click', function() {
            state.filters = {
                categories: [],
                brands: [],
                priceMin: null,
                priceMax: null
            };
            resetAndSearch();
        });
    };

    // Reset e pesquisar novamente
    const resetAndSearch = () => {
        state.offset = 0;
        state.hasMore = true;
        loadProducts(false);
    };

    // Mostrar loader
    const showLoader = (append) => {
        if (!append) {
            $('#hqs-grid').html(`
                <div class="hqs-loading-initial">
                    <div class="hqs-spinner"></div>
                    <p style="margin-top:15px">A procurar produtos...</p>
                </div>
            `);
        } else {
            if (!$('#hqs-scroll-loader').length) {
                $('#hqs-grid').append(`
                    <div id="hqs-scroll-loader" class="hqs-scroll-loader">
                        <div class="hqs-spinner"></div>
                    </div>
                `);
            }
        }
    };

    // Esconder loader de scroll
    const hideScrollLoader = () => {
        $('#hqs-scroll-loader').remove();
    };

    // Atualizar título
    const updateTitle = () => {
        $('#hqs-search-term').text(state.query);
        $('#hqs-total-hits').text(state.totalHits);
    };

    // Carregar produtos
    const loadProducts = (append = false) => {
        if (state.isLoading) return;
        if (append && !state.hasMore) return;

        state.isLoading = true;
        showLoader(append);

        // params base
        const params = {
            q: state.query,
            limit: state.limit,
            offset: append ? state.offset : 0
        };

        // filtros (formato Meili)
        const filters = [];
        if (state.filters.categories.length > 0) {
            const parts = state.filters.categories.map(
                (c) => `categories = \"${String(c).replace(/\"/g, '\\\"')}\"`
            );
            filters.push("(" + parts.join(" OR ") + ")");
        }
        if (state.filters.brands.length > 0) {
            const parts = state.filters.brands.map(
                (b) => `brand = \"${String(b).replace(/\"/g, '\\\"')}\"`
            );
            filters.push("(" + parts.join(" OR ") + ")");
        }
        if (state.filters.priceMin !== null) filters.push(`price >= ${Number(state.filters.priceMin)}`);
        if (state.filters.priceMax !== null) filters.push(`price <= ${Number(state.filters.priceMax)}`);

        // ===== DIRECT → Meili =====
        if (canDirectMeili()) {
            const body = {
                q: params.q,
                limit: params.limit,
                offset: params.offset,
                facets: ["categories", "brand", "price"]
            };
            if (filters.length) body.filter = filters.join(" AND ");

            meiliSearch(body)
                .then((json) => {
                    const hits = Array.isArray(json.hits) ? json.hits : [];

                    const products = hits
                        .map((h) => ({
                            id: Number(h.id || 0),
                            title: h.title || "",
                            permalink: h.url || h.permalink || "",
                            url: h.url || h.permalink || "",
                            image: h.image || h.thumbnail || "",
                            thumbnail: h.thumbnail || h.image || "",
                            brand: h.brand || "",
                            short_description: h.short_description || "",
                            price: Number(h.price || 0),
                            regular_price: Number(h.regular_price || 0),
                            sale_price: Number(h.sale_price || 0)
                        }))
                        .filter((p) => p.title && (p.url || p.permalink));

                    state.totalHits = Number(json.estimatedTotalHits || products.length);
                    state.hasMore = (params.offset + products.length) < state.totalHits;

                    if (append) state.offset += products.length;
                    else state.offset = products.length;

                    updateTitle();

                    if (!append) {
                        const fd = json.facetDistribution || {};
                        state.facets.categories = Object.entries(fd.categories || {}).map(([name, count]) => ({ name, count }));
                        state.facets.brands = Object.entries(fd.brand || {})
                            .filter(([name]) => name)
                            .map(([name, count]) => ({ name, count }));

                        const fs = json.facetStats || {};
                        state.facets.priceRange = fs.price
                            ? { min: Math.floor(fs.price.min || 0), max: Math.ceil(fs.price.max || 10000) }
                            : null;

                        updateSidebar();
                    }

                    const html = products.map(buildCardHTML).join("");
                    if (append) {
                        hideScrollLoader();
                        $("#hqs-grid").append(html);
                    } else {
                        $("#hqs-grid").html(html);
                    }

                    if (!products.length && !append) {
                        $("#hqs-grid").html(`
                            <div class=\"hqs-no-results\">
                                <h3>Não encontrámos produtos</h3>
                                <p>Tente ajustar os filtros ou pesquisar com outros termos.</p>
                            </div>
                        `);
                    }

                    state.isLoading = false;
                })
                .catch((err) => {
                    console.error("[HQS] Meili erro:", err);
                    hideScrollLoader();
                    if (!append) {
                        $("#hqs-grid").html(`
                            <div class=\"hqs-no-results\">
                                <h3>Erro de comunicação</h3>
                                <p>Não foi possível carregar os produtos. Tente novamente.</p>
                            </div>
                        `);
                    }
                    state.isLoading = false;
                });

            return;
        }

        // ===== FALLBACK → WP REST (como tinhas) =====
        if (state.filters.categories.length > 0) {
            params.categories = state.filters.categories.join(",");
        }
        if (state.filters.brands.length > 0) {
            params.brands = state.filters.brands.join(",");
        }
        if (state.filters.priceMin !== null) {
            params.price_min = state.filters.priceMin;
        }
        if (state.filters.priceMax !== null) {
            params.price_max = state.filters.priceMax;
        }

        $.ajax({
            url: config.apiUrl,
            method: 'GET',
            data: params,
            timeout: 15000,
            success: function(response) {
                if (typeof response === 'string') {
                    try { response = JSON.parse(response); } catch(e) { response = {}; }
                }

                let products = response.products || response.hits || [];
                if (Array.isArray(response)) products = response;

                state.totalHits = parseInt(response.total_hits) || 0;
                state.hasMore = response.has_more !== false && products.length >= state.limit;

                if (append) {
                    state.offset += products.length;
                } else {
                    state.offset = products.length;
                }

                updateTitle();

                if (!append) {
                    if (response.categories_facet) state.facets.categories = response.categories_facet;
                    if (response.brands_facet) state.facets.brands = response.brands_facet;
                    if (response.price_range) state.facets.priceRange = response.price_range;
                    updateSidebar();
                }

                if (!products || products.length === 0) {
                    if (!append) {
                        $('#hqs-grid').html(`
                            <div class=\"hqs-no-results\">
                                <h3>Não encontrámos produtos</h3>
                                <p>Tente ajustar os filtros ou pesquisar com outros termos.</p>
                            </div>
                        `);
                    } else {
                        hideScrollLoader();
                        $('#hqs-grid').append(`
                            <div class=\"hqs-end-message\">
                                Mostrando todos os ${state.totalHits} produtos
                            </div>
                        `);
                    }
                    state.hasMore = false;
                    state.isLoading = false;
                    return;
                }

                const html = products.map(buildCardHTML).join('');
                if (append) {
                    hideScrollLoader();
                    $('#hqs-grid').append(html);
                } else {
                    $('#hqs-grid').html(html);
                }

                state.isLoading = false;
            },
            error: function(xhr, status, error) {
                console.error('[HQS] Erro:', status, error);
                hideScrollLoader();

                if (!append) {
                    $('#hqs-grid').html(`
                        <div class=\"hqs-no-results\">
                            <h3>Erro de comunicação</h3>
                            <p>Não foi possível carregar os produtos. Tente novamente.</p>
                        </div>
                    `);
                }

                state.isLoading = false;
            }
        });
    };

    // Scroll infinito
    const initInfiniteScroll = () => {
        let ticking = false;
        
        $(window).on('scroll.hqs', function() {
            if (!ticking) {
                window.requestAnimationFrame(function() {
                    const scrollPos = $(window).scrollTop() + $(window).height();
                    const docHeight = $(document).height();
                    
                    // Carregar mais quando faltam 500px para o fim
                    if (scrollPos >= docHeight - 500 && !state.isLoading && state.hasMore) {
                        loadProducts(true);
                    }
                    
                    ticking = false;
                });
                ticking = true;
            }
        });
    };

    // Inicializar
    const init = () => {
        if (!state.query) {
            $('#hqs-grid').html(`
                <div class="hqs-no-results">
                    <h3>Pesquise produtos</h3>
                    <p>Utilize a barra de pesquisa para encontrar o que procura.</p>
                </div>
            `);
            return;
        }

        updateTitle();
        loadProducts(false);
        initInfiniteScroll();
    };

    init();
});