# Crunchyroll Devices Page Link Test Plan

## Objective

Verify that hyperlinks on `https://www.crunchyroll.com/devices` open their intended destinations successfully.

## Preconditions

- Use a supported desktop browser with internet access.
- Start with a fresh browser context so cookie-consent and other overlays are in their initial state.

## Test Steps

1. Navigate to `https://www.crunchyroll.com/devices`.
2. Verify the page loads without a browser error and displays the heading `CRUNCHYROLL IS ON YOUR FAVORITE DEVICES` and its device-category content.
3. Before clicking anything, inventory every visible, enabled hyperlink on the page, including links in the site navigation, device listings, service-provider listings, cookie notice (if shown), and footer. Record each link's accessible name and destination URL.
4. For each inventoried hyperlink:
   - Click the link.
   - If it opens a new tab or window, switch to that page; otherwise, use the current page.
   - Wait for the destination to finish its initial navigation.
   - Verify the destination is not a browser error page, its final URL matches the link or a reasonable redirect from it, and meaningful destination content is visible.
   - For same-page links, verify the expected URL fragment and target section instead of expecting a new document.
   - Return to the devices page before testing the next link. Use a fresh page or restore the original state when a consent overlay or navigation change affects the remaining inventory.

## Expected Results

- The devices page and its device-category sections render successfully.
- Every inventoried hyperlink responds to a click and reaches its intended page or section.
- External links may redirect to a localized or canonical URL, but must end on a usable page rather than an error page.
- No link causes an unexpected blank page, broken navigation, or browser error.

## Pass Criteria

Pass only when every inventoried hyperlink has been checked and reaches a usable intended destination. Record any inaccessible destination separately with its link name, URL, and observed error; do not silently count it as passed.
