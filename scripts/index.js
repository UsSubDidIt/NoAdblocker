// Enhanced Ad Blocker Detection Script
(function() {
    // Configuration options
    const config = {
        detectionUrls: [
            'https://gdmgsecure.com',
            'https://pagead2.googlesyndication.com',
            'https://ad.doubleclick.net',
            'https://www.googletagservices.com/tag/js/gpt.js',  // Google Publisher Tag
            'https://cdn.taboola.com/libtrc/your-publisher-name/loader.js', // Replace with a real Taboola publisher
            'https://static.criteo.net/js/ld/publishertag.js', // Criteo
            'https://js.adsrvr.org/', // The Trade Desk
            'https://ib.adnxs.com/ttj', // AppNexus (Xandr)
            'https://contextual.media.net/dmedianet.js',   // Media.net
            'https://aax.amazon-adsystem.com/s/apstag.js', // Amazon
            'https://ads.pubmatic.com/AdServer/js/gshowad.js', // PubMatic
            'https://adserver.adtechus.com/',            // AdTech
            'https://prebid.org/dist/prebid.js',         // Prebid.js (Common header bidding library)
            'https://acdn.adnxs.com/prebid/not-for-prod/1/prebid.js',  //another prebid url
            'https://cdn.jsdelivr.net/npm/prebid.js@latest/dist/not-for-prod/prebid.js', //prebid from cdn
            '/ads.js',     // Common local file name
            '/ads.min.js', // Common local file name (minified)
            '/advertisement.js',
            '/banner.js',
            '/adblocker.js', //ironic, but sometimes used.
            'https://fundingchoicesmessages.google.com/s/your_id/message.js', // Google funding choices.
        ],
        timeoutMs: 3000,
        debugMode: false,
        invisibleElementCheckDelay: 2000, // Delay in milliseconds before checking invisible elements
    };

    // Logger function
    function log(message, error = false) {
        if (config.debugMode) {
            if (error) {
                console.error(`[AdBlockDetector] ${message}`);
            } else {
                console.log(`[AdBlockDetector] ${message}`);
            }
        }
    }

    // Check URL accessibility
    function checkUrl(url) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const randomParam = `?rand=${Math.random()}`;
            const fullUrl = `${url}${randomParam}`;

            const timeoutId = setTimeout(() => {
                xhr.abort();
                reject({ type: 'timeout', message: 'Request timeout' });
            }, config.timeoutMs);

            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    clearTimeout(timeoutId);
                    if ((xhr.status >= 200 && xhr.status < 300) || (xhr.status >= 400 && xhr.status < 500)) {
                        resolve(true);
                    } else {
                        reject({ type: 'http_error', message: `HTTP status: ${xhr.status}`, status: xhr.status });
                    }
                }
            };

            xhr.onerror = function() {
                clearTimeout(timeoutId);
                reject({ type: 'network_error', message: 'Network error' });
            };

            try {
                xhr.open('GET', fullUrl, true);
                xhr.send();
            } catch (e) {
                clearTimeout(timeoutId);
                reject({ type: 'exception', message: e.message });
            }
        });
    }

    // Creates invisible elements with common ad-related class names
    function createInvisibleElements() {
        const adClasses = [
            'ads', 'ads-main', 'ad-main', 'AdHeader', 'AdContainer', 'AD_Top', 'homead', 'ad-lead',
            'google-adsense', 'adsense', 'ad-banner', 'ad-wrapper', 'ad-unit', 'ad-slot',
            'ad-space', 'ad-text', 'ad-box', 'ad-banner-top', 'ad-banner-bottom', 'ad-banner-left',
            'ad-banner-right', 'sponsored-link', 'sponsored-content', 'promoted-content',
            'advertisement', 'banner-ad', 'leaderboard-ad', 'skyscraper-ad', 'rectangle-ad',
            'ad_container', 'ad_wrapper', 'ad_banner', 'ad_iframe', 'ad_placeholder',
            'ad_block', 'ad_area', 'ad_section', 'ads_top', 'ads_bottom', 'ads_left', 'ads_right',
            'google_ads_iframe',  'taboola-placeholder', 'criteo-placeholder',
            'outbrain-placeholder', 'doubleclick-placeholder', 'adsbygoogle', 'adroll-placeholder',
            'amazon-ad-placeholder', 'mgid-placeholder',  'teads-placeholder', 'yieldmo-placeholder',
             'prebid-ad-unit',  'appnexus-ad-unit', //Header Bidding
            'pubmatic-ad-unit', 'rubicon-ad-unit',
        ];

        const elements = [];
        adClasses.forEach(className => {
            const div = document.createElement('div');
            div.className = className;
            div.style.cssText = 'position: absolute; top: -100px; left: -100px; width: 1px; height: 1px;';
            document.body.appendChild(div);
            elements.push(div);
        });
        return elements;
    }

    // Checks if the invisible elements are still visible
    function checkInvisibleElements(elements) {
        let blocked = false;
        elements.forEach(element => {
            if (
                element.offsetParent === null ||
                element.offsetHeight === 0 ||
                element.offsetWidth === 0 ||
                element.getClientRects().length === 0 ||
                window.getComputedStyle(element).display === 'none' ||
                window.getComputedStyle(element).visibility === 'hidden'
            ) {
                blocked = true;
            }
            element.remove();
        });
        return blocked;
    }


    // Checks for ad blocker by trying multiple URLs and checking invisible elements
    function detectAdBlocker() {
        return new Promise((resolve) => {
            const invisibleElements = createInvisibleElements();

            const detectionPromises = config.detectionUrls.map(url =>
                checkUrl(url)
                    .then(() => ({ url, blocked: false }))
                    .catch(error => ({ url, blocked: true, error }))
            );

            Promise.all(detectionPromises)
                .then(results => {
                    const anyAccessible = results.some(result => !result.blocked);

                    if (config.debugMode) {
                        log('Detection results (URLs):');
                        results.forEach(result => {
                            log(`${result.url}: ${result.blocked ? 'BLOCKED' : 'ACCESSIBLE'}`);
                            if (result.blocked && result.error) {
                                log(`Error: ${result.error.message}`, true);
                            }
                        });
                    }

                    setTimeout(() => {
                        const invisibleElementsBlocked = checkInvisibleElements(invisibleElements);
                        if (config.debugMode) {
                            log(`Detection results (invisible elements): ${invisibleElementsBlocked ? 'BLOCKED' : 'ACCESSIBLE'}`);
                        }
                        resolve(!anyAccessible || invisibleElementsBlocked);
                    }, config.invisibleElementCheckDelay);
                })
                .catch(error => {
                    log(`Unexpected error in detection: ${error.message}`, true);
                    resolve(true);
                });
        });
    }

    // HTML to replace the page with if ad blocker is detected
    const replacementHTML = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport"content="width=device-width, initial-scale=1.0"><title>You are using an ad-blocker</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      
      :root {
        --background: #f7f7f8;
        --foreground: #18181b;
        --primary: #4f46e5;
        --primary-foreground: #ffffff;
        --card: #ffffff;
        --card-foreground: #18181b;
        --muted: #e4e4e7;
        --muted-foreground: #71717a;
        --border: #e4e4e7;
        --radius: 0.5rem;
      }
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background-color: var(--background);
        color: var(--foreground);
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        padding: 1rem;
        line-height: 1.5;
      }
      
      .detected-container {
        width: 100%;
        max-width: 28rem;
      }
      
      .blocker-detected-card {
        background-color: var(--card);
        border-radius: var(--radius);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        overflow: hidden;
      }
      
      .blocker-detected-header {
        padding: 1.5rem 1.5rem 0;
      }
      
      .blocker-detected-content {
        padding: 1.5rem;
      }
      
      .blocker-detected-footer {
        padding: 1rem 1.5rem;
        background-color: var(--background);
        color: var(--muted-foreground);
        font-size: 0.75rem;
        text-align: center;
        border-top: 1px solid var(--border);
      }
      
      h1 {
        font-size: 1.25rem;
        font-weight: 600;
        line-height: 1.2;
        letter-spacing: -0.025em;
        margin-bottom: 0.5rem;
        color: var(--foreground);
      }
      
      .blocker-detected-description {
        color: var(--muted-foreground);
        font-size: 0.875rem;
        margin-bottom: 0.25rem;
      }
      
      .instruction {
        background-color: var(--background);
        border-radius: var(--radius);
        padding: 1rem;
        margin-bottom: 1rem;
        font-size: 0.875rem;
      }
      
      .instruction-title {
        font-weight: 500;
        margin-bottom: 0.5rem;
      }
      
      .instruction-text {
        color: var(--muted-foreground);
      }
      
      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        white-space: nowrap;
        border-radius: var(--radius);
        height: 2.5rem;
        padding: 0 1rem;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 150ms;
        cursor: pointer;
        text-decoration: none;
      }
      
      .button-primary {
        background-color: var(--primary);
        color: var(--primary-foreground);
        width: 100%;
        margin-top: 1rem;
      }
      
      .button-primary:hover {
        opacity: 0.9;
      }
      
      .button-link {
        color: var(--primary);
        height: auto;
        padding: 0;
      }
      
      .button-link:hover {
        text-decoration: underline;
      }
      
      .credit-link {
        color: inherit;
        text-decoration: none;
      }
      
      .credit-link:hover {
        text-decoration: underline;
      }
    </style>
    </head>
    <body>
      <div class="blocker-detected-container">
        <div class="blocker-detected-card">
          <div class="blocker-detected-header">
            <h1>Ad blocker detected</h1>
            <p class="blocker-detected-description">Please disable your ad blocker to continue using this site.</p>
          </div>
          
          <div class="blocker-detected-content">
            <div class="instruction">
              <div class="instruction-title">Why disable your ad blocker?</div>
              <p class="instruction-text">Ads help us keep this website running and provide you with free content. We promise to only show unobtrusive ads.</p>
            </div>
            
            <div class="instruction">
              <div class="instruction-title">How to proceed</div>
              <p class="instruction-text">
                1. Disable your ad blocker for this website<br>
                2. <a href="javascript:location.reload();" class="button-link">Refresh the page</a> to continue
              </p>
            </div>
            
            <a href="javascript:location.reload();" class="button button-primary">Try again</a>
          </div>
          
          <div class="blocker-detected-footer">
            Powered by <a href="https://noadblocker.be-a.dev/?ref=blocked-page&utm_source=${window.location.hostname}" target="_blank" class="credit-link">NoAdblocker</a>
          </div>
        </div>
      </div>
    </body>
    </html>`;

    // Replace page content if ad blocker is detected
    function replacePageContent() {
        log('Replacing page content due to ad blocker detection');
        document.open();
        document.write(replacementHTML);
        document.close();
    }

    // Run the ad blocker check
    function runAdBlockerCheck() {
        log('Running ad blocker detection');
        detectAdBlocker()
            .then((isBlocked) => {
                if (isBlocked) {
                    replacePageContent();
                }
            });
    }

    // Run the check immediately
    runCheck();
})();
