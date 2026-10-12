<?php
// Standalone regression test: load only the bridge, never bootstrap WordPress.
define( 'ABSPATH', __DIR__ );
function add_action( ...$args ) {}
function add_filter( ...$args ) {}
require $argv[1];
foreach ( array( '/alahly-spa/v1/auth/login', '/alahly-spa/v1/auth/me', '/alahly-spa/v1/auth/register', '/alahly-spa/v1/auth/logout', '/alahly-spa/v1/orders', '/alahly-spa/v1/unknown' ) as $route ) {
    foreach ( array( 200, 201, 400, 401, 403, 404, 500 ) as $status ) {
        $response = new class( $status ) {
            public $headers = array();
            public $status;
            public function __construct( $status ) { $this->status = $status; }
            public function header( $key, $value ) { $this->headers[$key] = $value; }
        };
        $request = new class( $route ) {
            private $route;
            public function __construct( $route ) { $this->route = $route; }
            public function get_route() { return $this->route; }
        };
        Alahly_SPA_Bridge::private_response( $response, null, $request );
        if ( $response->headers['Cache-Control'] !== 'private, no-store' || $response->status !== $status ) exit(1);
    }
}
$request = new class { public function get_route() { return '/alahly-spa/v10/orders'; } };
$response->headers = array();
Alahly_SPA_Bridge::private_response( $response, null, $request );
if ( $response->headers ) exit(1);
echo "PASS: bridge success/error cache headers; unrelated namespaces untouched\n";
