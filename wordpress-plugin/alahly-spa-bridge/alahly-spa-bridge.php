<?php
/**
 * Plugin Name: Alahly SPA Bridge
 * Description: Customer authentication and customer endpoints for the Alahly React storefront.
 * Version: 1.0.0
 */
defined( 'ABSPATH' ) || exit;

final class Alahly_SPA_Bridge {
	const NAMESPACE = 'alahly-spa/v1';
	const FRONTEND_ORIGIN = 'http://localhost:5173';
	const TOKEN_TTL = 900;

	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'routes' ) );
		add_filter( 'rest_pre_serve_request', array( __CLASS__, 'cors' ), 15, 4 );
		add_filter( 'allowed_redirect_hosts', array( __CLASS__, 'allowed_redirect_host' ) );
		add_filter( 'allowed_http_origins', array( __CLASS__, 'allowed_http_origins' ) );
		add_action( 'admin_post_nopriv_alahly_spa_auth_handoff', array( __CLASS__, 'auth_handoff' ) );
		add_action( 'admin_post_alahly_spa_auth_handoff', array( __CLASS__, 'auth_handoff' ) );
		add_action( 'admin_post_nopriv_alahly_spa_logout', array( __CLASS__, 'logout_handoff' ) );
		add_action( 'admin_post_alahly_spa_logout', array( __CLASS__, 'logout_handoff' ) );
	}

	public static function routes() {
		register_rest_route( self::NAMESPACE, '/auth/login', array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'login' ), 'permission_callback' => '__return_true' ) );
		register_rest_route( self::NAMESPACE, '/auth/me', array( 'methods' => 'GET', 'callback' => array( __CLASS__, 'me' ), 'permission_callback' => array( __CLASS__, 'authenticated_request' ) ) );
		register_rest_route( self::NAMESPACE, '/auth/logout', array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'logout' ), 'permission_callback' => array( __CLASS__, 'authenticated_request' ) ) );
		register_rest_route( self::NAMESPACE, '/orders', array( 'methods' => 'GET', 'callback' => array( __CLASS__, 'orders' ), 'permission_callback' => array( __CLASS__, 'authenticated_request' ) ) );
	}

	public static function cors( $served, $result, $request, $server ) {
		if ( 0 !== strpos( $request->get_route(), '/' . self::NAMESPACE ) ) return $served;
		if ( get_http_origin() === self::FRONTEND_ORIGIN ) {
			$server->send_header( 'Access-Control-Allow-Origin', self::FRONTEND_ORIGIN );
			$server->send_header( 'Access-Control-Allow-Methods', 'GET, POST, OPTIONS' );
			$server->send_header( 'Access-Control-Allow-Headers', 'Authorization, Content-Type' );
			$server->send_header( 'Access-Control-Max-Age', '600' );
			$server->send_header( 'Vary', 'Origin', false );
		}
		return $served;
	}

	public static function allowed_redirect_host( $hosts ) { $hosts[] = wp_parse_url( self::FRONTEND_ORIGIN, PHP_URL_HOST ); return $hosts; }
	public static function allowed_http_origins( $origins ) { $origins[] = self::FRONTEND_ORIGIN; return array_unique( $origins ); }
	private static function user_payload( $user ) { return array( 'id' => $user->ID, 'email' => $user->user_email, 'name' => $user->display_name ); }
	private static function base64url_encode( $value ) { return rtrim( strtr( base64_encode( $value ), '+/', '-_' ), '=' ); }
	private static function base64url_decode( $value ) { return base64_decode( strtr( $value, '-_', '+/' ) ); }

	private static function issue_token( $user_id ) {
		$payload = array( 'uid' => (int) $user_id, 'exp' => time() + self::TOKEN_TTL, 'jti' => wp_generate_uuid4() );
		$encoded = self::base64url_encode( wp_json_encode( $payload ) );
		$signature = hash_hmac( 'sha256', $encoded, wp_salt( 'auth' ), true );
		set_transient( 'alahly_spa_auth_' . $payload['jti'], $payload['uid'], self::TOKEN_TTL );
		return $encoded . '.' . self::base64url_encode( $signature );
	}

	private static function token_user( $token ) {
		$parts = explode( '.', (string) $token );
		if ( 2 !== count( $parts ) ) return false;
		$expected = self::base64url_encode( hash_hmac( 'sha256', $parts[0], wp_salt( 'auth' ), true ) );
		if ( ! hash_equals( $expected, $parts[1] ) ) return false;
		$payload = json_decode( self::base64url_decode( $parts[0] ), true );
		if ( ! is_array( $payload ) || empty( $payload['uid'] ) || empty( $payload['jti'] ) || empty( $payload['exp'] ) || $payload['exp'] < time() ) return false;
		if ( (int) get_transient( 'alahly_spa_auth_' . $payload['jti'] ) !== (int) $payload['uid'] ) return false;
		$user = get_user_by( 'id', (int) $payload['uid'] );
		return $user ?: false;
	}

	private static function bearer_token( $request = null ) {
		$header = $request instanceof WP_REST_Request ? $request->get_header( 'authorization' ) : ( $_SERVER['HTTP_AUTHORIZATION'] ?? '' );
		return preg_match( '/^Bearer\s+(.+)$/i', $header, $matches ) ? $matches[1] : '';
	}
	public static function authenticated_request( $request ) { return self::token_user( self::bearer_token( $request ) ) ? true : new WP_Error( 'alahly_auth_required', 'Authentication is required.', array( 'status' => 401 ) ); }

	public static function login( $request ) {
		$username = sanitize_text_field( (string) $request->get_param( 'username' ) );
		$password = (string) $request->get_param( 'password' );
		if ( '' === $username || '' === $password ) return new WP_Error( 'alahly_login_invalid', 'Username and password are required.', array( 'status' => 400 ) );
		$user = wp_authenticate( $username, $password );
		if ( is_wp_error( $user ) ) return new WP_Error( 'alahly_login_failed', 'Invalid username or password.', array( 'status' => 401 ) );
		return new WP_REST_Response( array( 'token' => self::issue_token( $user->ID ), 'user' => self::user_payload( $user ) ), 200 );
	}
	public static function me( $request ) { return self::user_payload( self::token_user( self::bearer_token( $request ) ) ); }
	public static function logout( $request ) {
		$token = self::bearer_token( $request ); $parts = explode( '.', $token );
		if ( 2 === count( $parts ) ) { $payload = json_decode( self::base64url_decode( $parts[0] ), true ); if ( ! empty( $payload['jti'] ) ) delete_transient( 'alahly_spa_auth_' . $payload['jti'] ); }
		return new WP_REST_Response( array( 'success' => true ), 200 );
	}
	public static function orders( $request ) {
		if ( ! function_exists( 'wc_get_orders' ) ) return new WP_Error( 'alahly_woocommerce_missing', 'WooCommerce is required.', array( 'status' => 503 ) );
		$user = self::token_user( self::bearer_token( $request ) );
		$orders = wc_get_orders( array( 'customer_id' => $user->ID, 'limit' => 50, 'orderby' => 'date', 'order' => 'DESC' ) );
		return array_map( static function( $order ) { return array( 'id' => $order->get_id(), 'number' => $order->get_order_number(), 'status' => $order->get_status(), 'total' => $order->get_total(), 'currency' => $order->get_currency(), 'date_created' => $order->get_date_created() ? $order->get_date_created()->date( DATE_ATOM ) : null ); }, $orders );
	}
	public static function auth_handoff() { $user = self::token_user( isset( $_POST['token'] ) ? sanitize_text_field( wp_unslash( $_POST['token'] ) ) : '' ); if ( ! $user ) wp_die( 'Your sign-in session expired. Please return to the storefront and sign in again.', 'Sign-in unavailable', array( 'response' => 401 ) ); $return_to = isset( $_POST['return_to'] ) ? esc_url_raw( wp_unslash( $_POST['return_to'] ) ) : self::return_url(); if ( wp_parse_url( $return_to, PHP_URL_HOST ) !== wp_parse_url( self::FRONTEND_ORIGIN, PHP_URL_HOST ) ) $return_to = self::return_url(); wp_set_auth_cookie( $user->ID, true, is_ssl() ); wp_safe_redirect( $return_to ); exit; }
	public static function logout_handoff() { wp_logout(); wp_safe_redirect( self::FRONTEND_ORIGIN . '/' ); exit; }
}
Alahly_SPA_Bridge::init();