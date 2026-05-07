# Tab Out Glance Widget

This is an experimental integration between Glance and a local Chrome extension
based on Tab Out.

Glance cannot read or close Chrome tabs by itself. The widget works by posting
messages from the Glance page to a Tab Out bridge content script injected into
the page by Chrome. The extension owns the Chrome permissions and calls
`chrome.tabs` and, when available, `chrome.processes`.

## How to try it

1. Clone and load the Tab Out fork extension from:

   ```sh
   git clone git@github.com:lalaze/tab-out.git
   ```

2. In Chrome, open `chrome://extensions`, enable Developer mode, click
   **Load unpacked**, and select the `extension/` directory from that clone.

3. Add the widget from
   [`examples/tab-out-widget.yml`](examples/tab-out-widget.yml) to a Glance page.

4. Open Glance using a URL matched by the extension:

   ```text
   http://100.96.195.115:<port>
   http://localhost:<port>
   http://127.0.0.1:<port>
   ```

If your Glance URL uses a different host, add it to the extension
`content_scripts.matches` list and reload the extension.

## Notes

- Closing and discarding tabs are executed by the Chrome extension, not by
  Glance.
- Memory numbers depend on `chrome.processes`. Chrome documents that API as a
  Dev-channel API, so the widget handles missing process data and still shows
  tabs/actions.
- The widget talks only to the local extension through `window.postMessage`; it
  does not send tab data to a server.
