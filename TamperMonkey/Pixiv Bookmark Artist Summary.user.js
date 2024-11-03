// ==UserScript==
// @name         Pixiv Bookmark Artist Summary
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Count illustrations per artist in bookmarks
// @match        https://www.pixiv.net/*/bookmarks*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Function to count bookmarks by artist
    let artists = {};
    let sortedArtists = [];
    let debounceTimer = null;

    // Function to check if the bookmarks list has changed
    const countIllusts = (artist) => Object.keys(artist.illustrations).length;
    const illustComparator = (a, b) => countIllusts(b) - countIllusts(a);

    function summarizeBookmarks() {
        const items = document.querySelectorAll('ul li[size] a[data-gtm-value]:not([data-gtm-user-id])');

        items.forEach(item => {
            let artistName = item.innerText;
            const artistLink = item.href;
            const artistId = item.getAttribute('data-gtm-value');
            if (!artistName){
                const item2 = item.querySelector("div[title]");
                if (item2){
                    artistName = item2.getAttribute('title');
                }
            }
            const parent = item.closest("li");

            let illustId = null;
            let illustLink = '';
            let illustTitle = '';
            let illustImg = '';
            let illustAlt = '';

            if (parent){

                const itemIllust = parent.querySelector("a[data-gtm-value][data-gtm-user-id]");

                if (itemIllust){
                    illustId = itemIllust.getAttribute('data-gtm-value');
                    illustLink = itemIllust.href;
                }
                const itemTitle = parent.querySelector("a:not([data-gtm-value][data-gtm-user-id])");
                if (itemTitle){
                    illustTitle = itemTitle.innerText;
                }
                if (itemIllust){
                    const itemIllustImg = itemIllust.querySelector("img");

                    if (itemIllustImg){
                        illustAlt = itemIllustImg.alt;
                        if (!illustTitle){
                            illustTitle = illustAlt;
                        }
                        illustImg = itemIllustImg.src;
                    }
                }
            }

            if (artistId) {
                if (!artists[artistId]) {
                    artists[artistId] = {
                        id: artistId,
                        name: artistName,
                        url: artistLink,
                        //count: 0,
                        illustrations: {},
                    };
                }
                let artist = artists[artistId];
                //artist.count++;
                let illust = {
                    id: illustId,
                    title: illustTitle,
                    alt: illustAlt,
                    url: illustLink,
                    img: illustImg,
                };
                artist.illustrations[illustId] = illust;
            }
        });
        sortedArtists = Object.values(artists).sort(illustComparator);

        requestAnimationFrame(renderSummary);
        //renderSummary();
    }


    // Function to render the summary UI
    function renderSummary() {
        // Clear previous summary if exists
        const existingSummary = document.getElementById('artist-summary');
        if (existingSummary) {
            existingSummary.remove();
        }
        // Create a summary element
        const summaryDiv = document.createElement('div');
        summaryDiv.id = 'artist-summary'; // Set an ID for easy removal
        summaryDiv.style.position = 'fixed';
        summaryDiv.style.bottom = '10px';
        summaryDiv.style.right = '10px';
        summaryDiv.style.backgroundColor = '#fff';
        summaryDiv.style.padding = '10px';
        summaryDiv.style.border = '1px solid #ccc';
        summaryDiv.style.zIndex = '9999';

        const title = document.createElement('h3');
        title.innerText = 'Artists';
        title.style.cursor = 'pointer'; // Change cursor to pointer
        title.style.margin = '0'; // Remove default margin

        // Create a container for artist data
        const summaryContent = document.createElement('div');
        summaryContent.style.display = 'none'; // Initially hidden
        summaryContent.style.padding = '10px';
        summaryContent.style.maxHeight = '300px'; // Set a maximum height
        summaryContent.style.overflowY = 'auto'; // Enable vertical scrolling

        // Toggle visibility of the artist container when the title is clicked
        title.addEventListener('click', () => {
            if (summaryContent.style.display === 'none') {
                summaryContent.style.display = 'block';
                title.innerText = 'Artists'; // Change title when expanded
            } else {
                summaryContent.style.display = 'none';
                title.innerText = 'Artists'; // Reset title when collapsed
            }
        });

        let totalCount = 0;
        const artistContainer = document.createElement('ol');
        //Object.entries(artists).forEach(([id, artist]) => {
        Object.values(sortedArtists).forEach((artist) => {
            let count = countIllusts(artist);
            // Create a list item for each artist
            const artistItem = document.createElement('li');
            const artistLink = document.createElement('a');
            artistLink.href = artist.url;
            artistLink.innerText = artist.name;

            // Create a span for count and add click event to toggle illustrations
            const countSpan = document.createElement('span');
            countSpan.innerText = `: ${count}`;
            countSpan.style.cursor = 'pointer'; // Change cursor to pointer
            countSpan.style.marginLeft = '5px';

            // Create a container for illustrations and initially hide it
            const illustContainer = document.createElement('ul');
            illustContainer.style.display = 'none'; // Initially hidden
            illustContainer.style.paddingLeft = '20px'; // Indent the illustrations

            // Populate illustrations
            Object.values(artist.illustrations).forEach((illust) => {
                const illustItem = document.createElement('li');
                let text = illust.alt || illust.title;
                illustItem.innerHTML = `<a href="${illust.url}" target="_blank">${text}</a>`;
                illustContainer.appendChild(illustItem);
            });

            // Append artist link and count span to artist item
            artistItem.appendChild(artistLink);
            artistItem.appendChild(countSpan);
            artistItem.appendChild(illustContainer);
            artistContainer.appendChild(artistItem);

            // Toggle illustration visibility when count is clicked
            countSpan.addEventListener('click', () => {
                illustContainer.style.display = (illustContainer.style.display === 'none') ? 'block' : 'none';
            });
            totalCount += count;
        });
        const totalContainer = document.createElement('p');
        totalContainer.innerHTML = `<span>Total: ${totalCount}</span>`;
        const logButton = document.createElement('button');
        logButton.innerHTML = `Log Items`;
        logButton.addEventListener('click', () => {
            //console.log(JSON.stringify(artists));
            console.log(JSON.stringify(sortedArtists));
        });

        summaryContent.appendChild(artistContainer);
        summaryContent.appendChild(totalContainer);
        summaryContent.appendChild(logButton);
        summaryDiv.appendChild(title);
        summaryDiv.appendChild(summaryContent);
        document.body.appendChild(summaryDiv);
    }

    // Function to debounce the summarizeBookmarks call
    function debouncedSummarize() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(summarizeBookmarks, 1000);
    }
    // Set up a MutationObserver to monitor changes in the bookmark list
    const observer = new MutationObserver((mutations) => {
        let added = false;
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length) {
                added = true;
            }
        });
        if (added){
            debouncedSummarize(); // Recalculate bookmarks whenever new nodes are added
        }
    });

    // Function to monitor URL changes
    function checkUrlChange() {
        // Delay execution to allow content to load
        setTimeout(() => {
            debouncedSummarize(); // Recalculate the artist summary
        }, 1000); // Adjust the timeout as needed
    }

    let previousHash = null;
    // Function to check if the bookmarks list has changed
    function checkForChanges() {
        const currentHash = location.href; // Check the URL hash
        if (currentHash !== previousHash) {
            previousHash = currentHash; // Update the previous hash
            debouncedSummarize(); // Recalculate the artist summary
        }
    }

    // Initial summary calculation when the page loads
    window.addEventListener('load', () => {
        setTimeout(() => {
            debouncedSummarize();
            previousHash = location.href; // Set initial hash
            setInterval(checkForChanges, 3000); // Poll every second for URL changes
            // Start observing the bookmark list for changes

            let targetNode = null;
            targetNode = document.querySelector('ul');
            if (targetNode) {
                observer.observe(targetNode, { childList: true, subtree: true, });
            }


            targetNode = document.querySelector('#root');
            if (targetNode) {
                observer.observe(targetNode, { childList: true, subtree: true, });
            }

        }, 3000); // Wait to load
    });

    // Listen for URL changes
    window.addEventListener('popstate', checkUrlChange);

})();
