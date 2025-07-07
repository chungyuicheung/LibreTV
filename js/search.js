// ===================================================================
// PART 1: Define the converter (place this at the top of your file)
// ===================================================================
const converter = OpenCC.Converter({ from: 'tw', to: 'cn' });


// ===================================================================
// PART 2: Your main search function (This is where the magic happens)
// ===================================================================
// This is the function called by your search button's `onclick="search()"`
async function search() {
    const searchInput = document.getElementById('searchInput');
    const originalQuery = searchInput.value.trim();

    if (!originalQuery) {
        showToast('請輸入搜索內容'); // Assuming you have a showToast function
        return;
    }

    // STEP 1: Convert the user's text to Simplified Chinese here.
    const simplifiedQuery = converter(originalQuery);

    console.log(`Original Text: ${originalQuery}`);
    console.log(`Converted to Simplified for API search: ${simplifiedQuery}`);

    // STEP 2: Now, call your main logic with the *simplified* query.
    // I am assuming you have a function that gets all selected APIs and then calls `searchByAPIAndKeyWord`.
    // Let's call it `searchAllApis`.
    
    // Show loading spinner, clear old results etc.
    ui.showLoading(); 
    ui.clearResults();

    // Pass the CONVERTED text to your search logic.
    const allResults = await searchAllApis(simplifiedQuery);

    // Display the final results on the page.
    ui.displayResults(allResults);
    ui.hideLoading();
}

/**
 * This function loops through selected APIs and calls your search function.
 * It receives the ALREADY CONVERTED query.
 */
async function searchAllApis(query) { // Note: `query` is already simplified here.
    // Get the list of enabled API IDs from your settings/checkboxes
    const selectedApiIds = getSelectedApiIds(); // You should already have a function for this

    const searchPromises = selectedApiIds.map(apiId => 
        // Pass the simplified query down to your function.
        searchByAPIAndKeyWord(apiId, query)
    );

    const resultsFromAllApis = await Promise.all(searchPromises);
    
    // Flatten the array of arrays into a single array of results
    return resultsFromAllApis.flat();
}


// ===================================================================
// PART 3: Your existing function (NO CHANGES NEEDED HERE)
// ===================================================================
// This function is perfect as it is. It correctly receives the query
// and uses it.
async function searchByAPIAndKeyWord(apiId, query) {
    try {
        let apiUrl, apiName, apiBaseUrl;
        
        // 处理自定义API
        if (apiId.startsWith('custom_')) {
            const customIndex = apiId.replace('custom_', '');
            const customApi = getCustomApiInfo(customIndex);
            if (!customApi) return [];
            
            apiBaseUrl = customApi.url;
            apiUrl = apiBaseUrl + API_CONFIG.search.path + encodeURIComponent(query);
            apiName = customApi.name;
        } else {
            // 内置API
            if (!API_SITES[apiId]) return [];
            apiBaseUrl = API_SITES[apiId].api;
            apiUrl = apiBaseUrl + API_CONFIG.search.path + encodeURIComponent(query);
            apiName = API_SITES[apiId].name;
        }
        
        // 添加超时处理
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(PROXY_URL + encodeURIComponent(apiUrl), {
            headers: API_CONFIG.search.headers,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            return [];
        }
        
        const data = await response.json();
        
        if (!data || !data.list || !Array.isArray(data.list) || data.list.length === 0) {
            return [];
        }
        
        // ... rest of your function is fine ...

        return data.list.map(item => ({
            ...item,
            source_name: apiName,
            source_code: apiId
        }));
        
    } catch (error) {
        console.warn(`API ${apiId} 搜索失败:`, error);
        return [];
    }
}