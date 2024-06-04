class Popup {
    constructor() {
        this.exchangeRateInput = document.getElementById('exchange-rate');
        this.saveRateButton = document.getElementById('save-rate');
        this.toggleConversionButton = document.getElementById('toggle-conversion');
        this.realtimeRateElement = document.getElementById('realtime-rate');
        this.targetCurrencyElement = document.getElementById('target-currency');
        this.realtimeCurrencyElement = document.getElementById('realtime-currency');
        this.currencySymbolElement = document.getElementById('currency-symbol');
        this.currencySelect = document.getElementById('currency-select');
        this.messageElement = document.getElementById('message');
        this.containerElement = document.querySelector('.container');

        this.saveRateButton.addEventListener('click', this.saveExchangeRate.bind(this));
        this.toggleConversionButton.addEventListener('click', this.toggleConversion.bind(this));
        this.currencySelect.addEventListener('change', this.handleCurrencyChange.bind(this));

        this.init();
    }

    async init() {
        const is1688 = await this.checkIf1688();
        if (!is1688) {
            this.showNot1688Message();
            return;
        }
        await this.populateCurrencySelect();
        await this.loadStoredCurrency();
        await this.loadExchangeRate();
        this.displayRealtimeExchangeRate();
        this.loadConversionState();
    }

    async checkIf1688() {
        return new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const currentTab = tabs[0];
                const url = new URL(currentTab.url);
                resolve(url.hostname.endsWith('1688.com'));
            });
        });
    }

    showNot1688Message() {
        this.messageElement.textContent = 'This extension only works on 1688.com';
        this.messageElement.style.display = 'block';
        this.containerElement.style.display = 'none';
    }

    /**
     * Utility function to get data from chrome storage
     * @param {string} key  
     */
    getChromeStorage(key) {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.get(key, (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(result[key] !== undefined ? result[key] : null);
                }
            });
        });
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

    async getCurrencySymbol() {
        const currencySymbol = await this.getChromeStorage('currencySymbol');

        if (currencySymbol == "") {
            chrome.storage.sync.set({ currencySymbol: '$' }, ({ currencySymbol }) => {
                return currencySymbol;
            });
        }
        return currencySymbol || '$';
    }

    async populateCurrencySelect() {
        const rates = await this.getRealtimeExchangeRate();
        if (rates) {
            this.currencySelect.innerHTML = '';

            // let defaultCurrency = 'USD'; // Set default currency code
            // if (!rates[defaultCurrency]) {
            //     // If USD is not available, set the default currency to the first currency in the rates object
            //     defaultCurrency = Object.keys(rates)[0];
            // }

            Object.entries(rates).forEach(([currency, rate]) => {
                const option = document.createElement('option');
                option.value = rate.toFixed(2); // Store rate as the value
                option.dataset.code = currency; // Store currency code as dataset
                option.textContent = `${currency} (${rate.toFixed(2)})`;

                // if (currency == defaultCurrency) {
                //     option.selected = true; // Select the default currency
                // } else {
                //     option.selected = false;
                // }

                this.currencySelect.appendChild(option);
            });
        }
    }

    async loadStoredCurrency() {

        const getCurrencyCode = await this.getChromeStorage('selectedCurrencyCode');

        if (getCurrencyCode) {
            // Find the option with the matching data-code attribute
            const selectedOption = Array.from(this.currencySelect.options).find(option => option.dataset.code == getCurrencyCode);
            if (selectedOption) {
                selectedOption.selected = true; // Select the option
                this.realtimeCurrencyElement.innerText = getCurrencyCode; // Currency Code
                this.targetCurrencyElement.innerText = getCurrencyCode; // Currency Code
            }
        }
    }

    async displayRealtimeExchangeRate() {
        this.currencySymbolElement.textContent = await this.getCurrencySymbol();
        const selectedCurrency = this.currencySelect.value;
        if (selectedCurrency) {
            this.realtimeRateElement.innerText = selectedCurrency;
        }
    }

    async loadExchangeRate() {
        const exchangeRate = await this.getChromeStorage('exchangeRate');
        if (exchangeRate) {
            this.exchangeRateInput.value = exchangeRate.toFixed(2);
        }
    }

    saveExchangeRate() {
        const selectedOption = this.currencySelect.options[this.currencySelect.selectedIndex];
        const selectedCurrencyCode = selectedOption.dataset.code; // get selected currency code
        const exchangeRate = parseFloat(this.exchangeRateInput.value); // get input exchange rate 


        if (!isNaN(exchangeRate) && selectedCurrencyCode) {
            chrome.storage.sync.set({ exchangeRate: exchangeRate, selectedCurrencyCode: selectedCurrencyCode }, () => {
                alert('Exchange rate and selected currency saved!');
            });
        } else {
            alert('Please enter a valid number and select a currency');
        }
    }

    loadConversionState() {
        chrome.storage.sync.get('conversionEnabled', ({ conversionEnabled }) => {
            if (conversionEnabled) {
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
        const realTimeRate = this.currencySelect.value;
        const selectedOption = this.currencySelect.options[this.currencySelect.selectedIndex];
        const selectedCurrencyCode = selectedOption.dataset.code;
        const exchangeRate = parseFloat(selectedOption.value);

        if (selectedCurrencyCode && exchangeRate) {
            this.exchangeRateInput.value = exchangeRate; // Input rate 
            this.realtimeCurrencyElement.innerText = selectedCurrencyCode; // Currency Code
            this.targetCurrencyElement.innerText = selectedCurrencyCode; // Currency Code
            this.realtimeRateElement.innerText = realTimeRate; // Currency Real Time exchange rate 
        }
    }
}

new Popup();
