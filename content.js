class ContentScript {
    constructor() {
        this.init();
    }

    init() {
        this.bindMessageListener();
        window.addEventListener('load', this.initConversion.bind(this));
    }

    initConversion() {
        chrome.storage.sync.get(['exchangeRate', 'conversionEnabled', 'currencySymbol'], (data) => {
            if (data.exchangeRate) {
                this.convertPrices(data.exchangeRate, data.conversionEnabled, data.currencySymbol);
            } else {
                console.warn('Exchange rate not set');
            }
        });
    }

    convertPrices(exchangeRate, convert, currencySymbol) {
        const priceBoxes = document.querySelectorAll('.price-box');
        priceBoxes.forEach((priceBox) => {
            const unitElement = priceBox.querySelector('.price-unit');
            const priceElement = priceBox.querySelector('.price-text');

            if (unitElement && priceElement) {
                if (!priceElement.dataset.originalPrice) {
                    const originalPrice = parseFloat(priceElement.innerText);
                    if (!isNaN(originalPrice)) {
                        priceElement.dataset.originalPrice = originalPrice;
                    }
                }

                const originalPrice = parseFloat(priceElement.dataset.originalPrice);
                if (!isNaN(originalPrice)) {
                    if (convert) {
                        const priceInBDT = (originalPrice * exchangeRate).toFixed(2);
                        unitElement.innerText = currencySymbol;
                        priceElement.innerText = priceInBDT;
                        priceBox.addEventListener('mouseenter', this.showOriginalPriceTooltip.bind(this, originalPrice, priceBox));
                    } else {
                        unitElement.innerText = '¥';
                        priceElement.innerText = originalPrice.toFixed(2);
                        priceBox.addEventListener('mouseenter', this.showConvertedPriceTooltip.bind(this, originalPrice * exchangeRate, priceBox, currencySymbol));
                    }
                    priceBox.addEventListener('mouseleave', this.removeTooltip);
                }
            }
        });
    }

    showOriginalPriceTooltip(originalPrice, priceBox) {
        this.removeTooltip(); // remove all previos duplicate tooltips
        const tooltip = this.createTooltip(`¥ ${originalPrice.toFixed(2)}`);
        const rect = priceBox.getBoundingClientRect();
        tooltip.style.left = `${rect.left + window.scrollX}px`;
        tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
        priceBox.dataset.tooltipId = tooltip.id;
    }

    showConvertedPriceTooltip(convertedPrice, priceBox, currencySymbol) {
        const tooltip = this.createTooltip(`${currencySymbol} ${convertedPrice.toFixed(2)}`);
        const rect = priceBox.getBoundingClientRect();
        tooltip.style.left = `${rect.left + window.scrollX}px`;
        tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
        priceBox.dataset.tooltipId = tooltip.id;
    }

    createTooltip(text) {
        const tooltip = document.createElement('div');
        tooltip.className = 'fxcjahid3 tooltip';
        tooltip.innerText = text;
        document.body.appendChild(tooltip);
        return tooltip;
    }

    removeTooltip(event) {
        const tooltip = document.querySelectorAll('.fxcjahid3.tooltip');
        tooltip.forEach(element => {
            element.remove();
        });
    }

    bindMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'toggleConversion') {
                chrome.storage.sync.get(['exchangeRate', 'conversionEnabled', 'currencySymbol'], (data) => {
                    this.convertPrices(data.exchangeRate, data.conversionEnabled, data.currencySymbol);
                });
            }
        });
    }
}

new ContentScript();
