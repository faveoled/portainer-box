#!/usr/bin/env gjs

const jsModulesPath = "/app/portainer-box"

const GLib = imports.gi.GLib;
const Soup = imports.gi.Soup;

imports.gi.versions.Gtk = "3.0";

const { Gtk, Gdk, GObject, Gio, WebKit2: WebKit } = imports.gi;
// add scripts directory to module paths
imports.searchPath.unshift(jsModulesPath);

const { Pipe } = imports.pipe
const { getRandomPorts } = imports.random_ports


let xdgHomeDir = GLib.getenv("XDG_DATA_HOME")
if (xdgHomeDir === null) {
    logError("ERROR: XDG_DATA_HOME is not defined");
}

let randomPorts = getRandomPorts();

let bindHttp = "127.0.0.1:" + randomPorts[0];
let bindHttps = "127.0.0.1:" + randomPorts[1];
let tunnelAddr = "127.0.0.1"
let tunnelPort = randomPorts[2].toString();
let homeUrl = "http://localhost:" + randomPorts[0];

let CFG = {
    "appName": "Portainer Box",
    "homeUrl": homeUrl,
    "bindUrl": bindHttp,
    "appId": "io.github.faveoled.Portainer-Box",
    "serverCmdLine": [
        "/app/portainer/portainer", 
        "--data", xdgHomeDir, 
        "--bind", bindHttp,
        "--bind-https", bindHttps,
        "--tunnel-addr", tunnelAddr,
        "--tunnel-port", tunnelPort
    ]
}
log("server command line: " + CFG["serverCmdLine"].join(" "))


Gtk.init(null);

const WebBrowser = GObject.registerClass(
class WebBrowser extends Gtk.Application {
    // Create the application itself
    _init() {
        super._init({
            application_id: CFG["appId"]
        });

        this._homeUrl = CFG["homeUrl"];

        // Connect "activate" and "startup" signals to the callback functions
        this.connect("activate", () => this._onActivate())
        this.connect("startup", () => this._onStartup())


    }

    // Callback function for "activate" signal
    _onActivate() {
        // Present window when active
        this._window.present();

        // Grab focus to the Url Bar when active
        this._urlBar.grab_focus();

        // Load the default home page when active
        this._webView.load_uri(this._homeUrl);
    }

    cancelProcess = null;
    // Callback function for "startup" signal
    _onStartup() {

        try {
            // The process starts running immediately after this function is called. Any
            // error thrown here will be a result of the process failing to start, not
            // the success or failure of the process itself.
            this.process = new Pipe(...CFG["serverCmdLine"])

            // start the process and start reading output line by line
            this.cancelProcess = this.process.start(line => print(line))

        } catch (e) {
            logError(e);
        }

        // Build the UI
        this._buildUI();

        // Connect the UI signals
        this._connectSignals();


    }

    _destroy() {
        if (this.cancelProcess === null) {
            return;
        }
        this.cancelProcess();
    }

    // Build the application"s UI
    _buildUI() {
        // Create the application window
        this._window = new Gtk.ApplicationWindow({
            application: this,
            window_position: Gtk.WindowPosition.CENTER,
            border_width: 0,
            title: CFG["appName"]
        });
        const screen = Gdk.Screen.get_default();        
        this._window.set_default_size(
            screen.get_width(),
            screen.get_height()
          );

        // Create the application toolbar
        let toolbar = new Gtk.HeaderBar({ show_close_button: true });

        // Create the browser buttons (Back, Forward and Reload)
        this._backButton = Gtk.Button.new_from_icon_name("go-previous-symbolic", Gtk.IconSize.MENU);
        this._backButton.get_style_context().add_class("flat");
        this._forwardButton = Gtk.Button.new_from_icon_name("go-next-symbolic", Gtk.IconSize.MENU);
        this._forwardButton.get_style_context().add_class("flat");
        this._reloadButton = Gtk.Button.new_from_icon_name("view-refresh-symbolic", Gtk.IconSize.MENU);
        this._reloadButton.get_style_context().add_class("flat");

        // Create the Url Bar
        this._urlBar = new Gtk.Entry({ hexpand: true });

        // Add browser buttons to the toolbar
        toolbar.pack_start (this._backButton);
        toolbar.pack_start (this._forwardButton);
        toolbar.pack_start (this._reloadButton);
        toolbar.set_custom_title(this._urlBar);

        // Create the WebKit WebView, our window to the web
        this._webView = new WebKit.WebView();
        this._webView.get_settings().enableJavascript = true;
        this._webView.get_settings().set_javascript_can_access_clipboard(true);
        this._webView.get_settings().set_javascript_can_open_windows_automatically(false);


        // Add the box to the window
        this._window.set_titlebar(toolbar);
        this._window.add(this._webView);

        // Show the window and all child widgets
        this._window.show_all();


        this._window.connect("destroy", () => {
            log("Closing the app");
            this._destroy();
        })

    }

    _connectSignals() {
        // When an URL is entered, call web_view to open it
        this._urlBar.connect("activate", () => {
            this._webView.load_uri(this._urlBar.text);
        });

        // Update the url bar and buttons when a new page is loaded
        this._webView.connect("load_changed", (webView, loadEvent) => {
            if (loadEvent !== WebKit.LoadEvent.COMMITTED) {
                return
            }
            this._urlBar.text = this._webView.get_uri();
            this._updateButtons();
        });

        // When the back button is clicked, go back
        this._backButton.connect("clicked", () => {
            this._webView.go_back();
        });

        // When the forward button is clicked, go forward
        this._forwardButton.connect("clicked", () => {
            this._webView.go_forward();
        });

        // When the realod button is clicked, reload
        this._reloadButton.connect("clicked", () => {
            this._webView.reload();
        })
    }

    _updateButtons() {
        // Set back button and forward button sensitive if it's possible to go
        // back or forward respectively
        this._backButton.sensitive = this._webView.can_go_back();
        this._forwardButton.sensitive = this._webView.can_go_forward();
    }
});


// Run the application
const app = new WebBrowser();
app.run(ARGV);
