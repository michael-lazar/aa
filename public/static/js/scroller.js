document.addEventListener('DOMContentLoaded', async () => {
    let isLoading = false;
    let allFilesLoaded = false;
    let filesLoaded = 0;
    let currentDirectory = '2ch'; // Default directory
    let currentOrder = 'name'; // Default order
    let currentPattern = ''; // Default pattern
    let allFileNames = []; // Array to hold all filenames

    let dotCount = 0;
    const loadingDots = document.getElementById('loadingDots');

    const updateLoadingDots = () => {
        dotCount = (dotCount + 1) % 4; // Cycle dotCount from 0 to 3
        loadingDots.textContent = '.'.repeat(dotCount);
    };

    const parseDirectoryHtml = (html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const links = Array.from(doc.querySelectorAll('a'));

        let fileNames = links.reduce((accum, link) => {
            if (link.href.endsWith('.html')) {
                accum.push(link.getAttribute('href'));
            }
            return accum;
        }, []);

        // For random sorting, sort in JavaScript
        if (currentOrder === 'random') {
            fileNames = fileNames.sort(() => 0.5 - Math.random());
        }

        return fileNames;
    };

    const loadFileDirectory = async () => {
        // Fetch and store all filenames once when the page loads
        let url = `/utf8art/${currentDirectory}/`;

        if (currentPattern !== "") {
            url += `?P=*${currentPattern}*`;
        }
        else if (currentOrder === 'name') {
            url += '?C=N;O=A';
        } else if (currentOrder === 'namereverse') {
            url += '?C=N;O=D';
        }

        const response = await fetch(url);
        const html = await response.text();
        allFileNames = parseDirectoryHtml(html); // Store all filenames

        const contentDiv = document.getElementById('content'); // Select the div with id="content"

        // Display the number of files at the top
        const fileCountElement = document.createElement('p');
        fileCountElement.textContent = `Number of files: ${allFileNames.length}`;
        contentDiv.appendChild(fileCountElement);
    }

    const loadMoreFiles = async () => {
        if (isLoading || allFilesLoaded) return;
        isLoading = true;

        const nextFiles = await getNextFiles(filesLoaded, 10); // Limit to 5 files per load
        if (nextFiles.length === 0) {
            allFilesLoaded = true;
        } else {
            appendFilesToDocument(nextFiles);
            filesLoaded += nextFiles.length;
        }
        isLoading = false;
    };

    const getNextFiles = async (startFrom, limit = 5) => {
        const fileNames = allFileNames.slice(startFrom, startFrom + limit);

        const fileData = await Promise.all(fileNames.map(async fileName => {
            const resp = await fetch(`/utf8art/${currentDirectory}/${fileName}`);
            const text = await resp.text();
            return {fileName, contents: text};
        }));

        return fileData;
    };

    window.addEventListener('scroll', () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
            document.getElementById('loadingPlaceholder').style.display = 'block'; // Show loading message
            const loadingAnimationInterval = setInterval(updateLoadingDots, 200); // Update every 500 milliseconds

            loadMoreFiles();

            document.getElementById('loadingPlaceholder').style.display = 'none'; // Hide loading message
            clearInterval(loadingAnimationInterval);
        }
    });

    const refreshContent = () => {
        resetAndLoadFiles();
    };

    const orderSelector = document.getElementById('order');
    orderSelector.addEventListener('change', (event) => {
        currentOrder = event.target.value;
        refreshContent();
    });

    const directorySelector = document.getElementById('subdirectory');
    directorySelector.addEventListener('change', (event) => {
        currentDirectory = event.target.value;
        refreshContent();
    });

    const patternInput = document.getElementById('pattern');
    patternInput.addEventListener('change', (event) => {
        currentPattern = event.target.value;
    });

    const refreshButton = document.getElementById('refreshButton');
    refreshButton.addEventListener('click', refreshContent);

    const resetAndLoadFiles = async () => {
        document.getElementById('content').innerHTML = ''; // Clear existing content
        filesLoaded = 0;
        allFilesLoaded = false;
        isLoading = false; // Reset isLoading to allow new load

        document.getElementById('loadingPlaceholder').style.display = 'block'; // Show loading message
        const loadingAnimationInterval = setInterval(updateLoadingDots, 200); // Update every 500 milliseconds

        await loadFileDirectory();
        await loadMoreFiles(); // Load files from new directory

        document.getElementById('loadingPlaceholder').style.display = 'none'; // Hide loading message
        clearInterval(loadingAnimationInterval);
    };

    const appendFilesToDocument = (fileData) => {
        const contentDiv = document.getElementById('content'); // Select the div with id="content"

        fileData.forEach(({fileName, contents}) => {
            const bodyContent = extractBodyContent(contents);
            const fullPath = `/utf8art/${currentDirectory}/${fileName}`;
            const decodedPath = decodeURIComponent(fullPath); // Decode for display
            const fileLink = `<a href="${fullPath}">${decodedPath}</a>`; // Use decoded path for display
            contentDiv.insertAdjacentHTML('beforeend', fileLink + bodyContent); // Append to the div
        });
    };

    const extractBodyContent = (htmlContent) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const body = doc.querySelector('body');

        return body ? body.innerHTML : '';
    };

    await resetAndLoadFiles();
});
