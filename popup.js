class Popup {
    constructor() {
        this.exchangeRateInput = document.getElementById('exchange-rate');
        this.saveRateButton = document.getElementById('save-rate');
        this.toggleConversionButton = document.getElementById('toggle-conversion');
        this.realtimeRateElement = document.getElementById('realtime-rate');
        this.targetCurrencyElement = document.getElementById('target-currency');
        this.realtimeCurrencyElement = document.getElementById('realtime-currency');
        this.currencySelect = document.getElementById('currency-select');

        this.saveRateButton.addEventListener('click', this.saveExchangeRate.bind(this));
        this.toggleConversionButton.addEventListener('click', this.toggleConversion.bind(this));
        this.currencySelect.addEventListener('change', this.handleCurrencyChange.bind(this));

        this.init();
    }

    async init() {
        await this.populateCurrencySelect();
        await this.loadStoredCurrency();
        await this.loadExchangeRate(); // Load exchange rate before displaying realtime rate
        this.displayRealtimeExchangeRate();
        this.loadConversionState();
        this.currencySelect.dispatchEvent(new Event('change')); // Trigger change event to update displayed values
    }

    async populateCurrencySelect() {
        const rates = await this.getRealtimeExchangeRate();
        if (rates) {
            this.currencySelect.innerHTML = '';
            let defaultCurrency = 'USD'; // Set default currency code
            if (!rates[defaultCurrency]) {
                // If USD is not available, set the default currency to the first currency in the rates object
                defaultCurrency = Object.keys(rates)[0];
            }
            Object.entries(rates).forEach(([currency, rate]) => {
                const option = document.createElement('option');
                option.value = rate.toFixed(2); // Store rate as the value
                option.dataset.code = currency; // Store currency code as dataset
                option.textContent = `${currency} (${rate.toFixed(2)})`;

                if (currency == defaultCurrency) {
                    option.selected = true; // Select the default currency
                } else {
                    option.selected = false;
                }

                this.currencySelect.appendChild(option);
            });
        }
    }

    async loadStoredCurrency() {
        chrome.storage.sync.get('selectedCurrency', (data) => {
            const selectedCurrency = data.selectedCurrency;
            if (selectedCurrency) {
                // Find the option with the matching data-code attribute
                const selectedOption = Array.from(this.currencySelect.options).find(option => option.dataset.code === selectedCurrency);
                if (selectedOption) {
                    selectedOption.selected = true; // Select the option
                }
            }
        });
    }


    async displayRealtimeExchangeRate() {
        const rates = await this.getRealtimeExchangeRate();
        const selectedCurrency = this.currencySelect.value;
        if (rates && selectedCurrency) {
            this.realtimeRateElement.innerText = selectedCurrency;
        } else {
            this.realtimeRateElement.innerText = 'Error fetching rate';
        }
    }

    async getRealtimeExchangeRate() {
        try {
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/CNY');
            const data = await response.json();
            delete data.rates.CNY; // Remove CNY rate from response
            return data.rates;
        } catch (error) {
            console.error('Error fetching exchange rate:', error);
            return null;
        }
    }

    async loadExchangeRate() {
        const exchangeRate = await this.retrieveExchangeRate();
        if (exchangeRate) {
            this.exchangeRateInput.value = exchangeRate.toFixed(2);
        }
    }

    async retrieveExchangeRate() {
        return new Promise((resolve) => {
            chrome.storage.sync.get('exchangeRate', (data) => {
                resolve(data.exchangeRate);
            });
        });
    }

    saveExchangeRate() {
        const exchangeRate = parseFloat(this.exchangeRateInput.value);
        const selectedCurrency = this.currencySelect.value;

        if (!isNaN(exchangeRate) && selectedCurrency) {
            chrome.storage.sync.set({ exchangeRate, selectedCurrency }, () => {
                alert('Exchange rate and selected currency saved!');
            });
        } else {
            alert('Please enter a valid number and select a currency');
        }
    }

    loadConversionState() {
        chrome.storage.sync.get('conversionEnabled', (data) => {
            if (data.conversionEnabled) {
                this.toggleConversionButton.innerText = 'Disable Conversion';
                this.toggleConversionButton.classList.remove('disable');
                this.toggleConversionButton.classList.add('enable');
            } else {
                this.toggleConversionButton.innerText = 'Enable Conversion';
                this.toggleConversionButton.classList.remove('enable');
                this.toggleConversionButton.classList.add('disable');
            }
        });
    }

    toggleConversion() {
        chrome.storage.sync.get('conversionEnabled', (data) => {
            const newState = !data.conversionEnabled;
            chrome.storage.sync.set({ conversionEnabled: newState }, () => {
                this.toggleConversionButton.innerText = newState ? 'Disable Conversion' : 'Enable Conversion';
                this.toggleConversionButton.classList.toggle('enable', newState);
                this.toggleConversionButton.classList.toggle('disable', !newState);
                this.notifyContentScript();
            });
        });
    }

    notifyContentScript() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleConversion' });
        });
    }

    handleCurrencyChange() {
        const selectedOption = this.currencySelect.options[this.currencySelect.selectedIndex];
        const selectedCurrencyCode = selectedOption.dataset.code;
        const exchangeRate = parseFloat(selectedOption.value);

        if (selectedCurrencyCode && exchangeRate) {
            chrome.storage.sync.set({ selectedCurrency: selectedCurrencyCode }, () => {
                this.exchangeRateInput.value = exchangeRate;
                this.realtimeCurrencyElement.innerText = selectedCurrencyCode; // Currency Code
                this.targetCurrencyElement.innerText = selectedCurrencyCode; // Currency Code
                this.displayRealtimeExchangeRate();
            });
        }
    }
}

new Popup();
