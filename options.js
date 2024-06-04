document.addEventListener('DOMContentLoaded', () => {
    const optionsForm = document.getElementById('options-form');

    optionsForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const currencySymbolInput = document.getElementById('currency-symbol');
        const currencySymbol = currencySymbolInput.value;

        if (currencySymbol.trim().length > 0) {
            chrome.storage.sync.set({ currencySymbol }, () => {
                alert('Currency symbol saved successfully!');
            });
        }
    });

    chrome.storage.sync.get('currencySymbol', (data) => {
        const currencySymbol = data.currencySymbol;
        if (currencySymbol) {
            document.getElementById('currency-symbol').value = currencySymbol;
        }
    });
});
