// ===================================================================
// PART 1: Create a PROMISE that will resolve with the ready converter
// This should be at the top of your js/search.js file.
// ===================================================================
const converterPromise = OpenCC.Converter({ from: 'tw', to: 'cn' });


// ===================================================================
// PART 2: Your main search function, now corrected to WAIT for the converter
// This function will be called by your search button.
// ===================================================================
async function search() {
    try {
        // ui.showLoading(); // Show a loading spinner immediately if you have one

        // STEP 1: Wait for the converter to finish loading its dictionaries.
        const converter = await converterPromise;

        const searchInput = document.getElementById('searchInput');
        const originalQuery = searchInput.value.trim();

        if (!originalQuery) {
            showToast('請輸入搜索內容');
            // ui.hideLoading();
            return;
        }

        // STEP 2: Now it's safe to convert the text.
        const simplifiedQuery = converter(originalQuery);
        console.log(`Original: ${originalQuery}, Simplified: ${simplifiedQuery}`);

        // STEP 3: Pass the simplified query to your API functions.
        // ui.clearResults(); // Clear previous results
        const allResults = await searchAllApis(simplifiedQuery);
        // ui.displayResults(allResults); // Display new results

    } catch (error) {
        // This will catch any error during conversion or searching.
        console.error("An error occurred during the search process:", error);
        showToast("搜索失敗，請檢查瀏覽器控制台獲取更多信息。");
    } finally {
        // ui.hideLoading(); // Always hide the loading spinner at the end
    }
}

/**
 * This function receives the ALREADY CONVERTED query and calls your other function.
 * This part is likely correct already.
 */
async function searchAllApis(query) {
    const selectedApiIds = getSelectedApiIds(); // Assuming you have this function
    const searchPromises = selectedApiIds.map(apiId => searchByAPIAndKeyWord(apiId, query));
    const resultsFromAllApis = await Promise.all(searchPromises);
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