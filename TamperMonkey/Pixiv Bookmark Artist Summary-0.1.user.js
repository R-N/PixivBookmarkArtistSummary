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
    var artists = {};

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
        console.log(JSON.stringify(artists));
        artists = Object.values(artists).sort(illustComparator);
        console.log(JSON.stringify(artists));

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
        Object.values(artists).forEach((artist) => {
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
        totalContainer.innerHTML = `<p>Total: ${totalCount}</p>`;

        summaryContent.appendChild(artistContainer);
        summaryContent.appendChild(totalContainer);
        summaryDiv.appendChild(title);
        summaryDiv.appendChild(summaryContent);
        document.body.appendChild(summaryDiv);
    }

    // Set up a MutationObserver to monitor changes in the bookmark list
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length) {
                summarizeBookmarks(); // Recalculate bookmarks whenever new nodes are added
            }
        });
    });

    // Start observing the bookmark list for changes
    const targetNode = document.querySelector('ul'); // Adjust the selector if needed
    if (targetNode) {
        observer.observe(targetNode, {
            childList: true, // Observe direct children
            subtree: true,   // Observe all descendants
        });
    }

    // Function to monitor URL changes
    function checkUrlChange() {
        // Delay execution to allow content to load
        setTimeout(() => {
            summarizeBookmarks(); // Recalculate the artist summary
        }, 1000); // Adjust the timeout as needed
    }

    var previousHash = null;
    // Function to check if the bookmarks list has changed
    function checkForChanges() {
        const currentHash = location.href; // Check the URL hash
        if (currentHash !== previousHash) {
            previousHash = currentHash; // Update the previous hash
            summarizeBookmarks(); // Recalculate the artist summary
        }
    }

    // Initial summary calculation when the page loads
    window.addEventListener('load', () => {
        setTimeout(() => {
            summarizeBookmarks();
            previousHash = location.href; // Set initial hash
            setInterval(checkForChanges, 1000); // Poll every second for URL changes
        }, 3000); // Wait to load
    });

    // Listen for URL changes
    window.addEventListener('popstate', checkUrlChange);

})();
