param([string]$Storefront = 'http://alahly.test:5173', [string]$WordPress = 'http://alahly.test')
$ErrorActionPreference = 'Stop'
if (([uri]$Storefront).Host -ne 'alahly.test' -or ([uri]$WordPress).Host -ne 'alahly.test') { throw 'This test is restricted to local alahly.test.' }
Add-Type -AssemblyName System.Net.Http
$handler = [System.Net.Http.HttpClientHandler]::new()
$handler.CookieContainer = [System.Net.CookieContainer]::new()
$client = [System.Net.Http.HttpClient]::new($handler)
$client.Timeout = [TimeSpan]::FromSeconds(20)
$api = "$Storefront/wp-json/wc/store/v1"
$script:cartNonce = $null
function Send-CartRequest([string]$Path, [object]$Body = $null) {
    $method = if ($null -eq $Body) { [System.Net.Http.HttpMethod]::Get } else { [System.Net.Http.HttpMethod]::Post }
    $request = [System.Net.Http.HttpRequestMessage]::new($method, "$api$Path")
    if ($null -ne $Body) {
        $request.Content = [System.Net.Http.StringContent]::new(($Body | ConvertTo-Json -Compress), [Text.Encoding]::UTF8, 'application/json')
        if ($script:cartNonce) { $request.Headers.Add('Nonce', $script:cartNonce) }
    }
    try {
        $response = $client.SendAsync($request).GetAwaiter().GetResult()
        try {
            if (-not $response.IsSuccessStatusCode) { throw "Cart HTTP status $([int]$response.StatusCode) for $Path" }
            if ($response.Headers.Contains('Nonce')) { $script:cartNonce = @($response.Headers.GetValues('Nonce'))[0] }
            return ($response.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json)
        } finally { $response.Dispose() }
    } finally { $request.Dispose() }
}
$addedKey = $null
try {
    $initial = Send-CartRequest '/cart'
    if (@($initial.items).Count -ne 0) { throw 'Expected a new empty guest session; no existing cart will be changed.' }
    $products = Send-CartRequest '/products?type=simple&stock_status=instock&per_page=10'
    $product = $products | Where-Object { $_.is_purchasable -and $_.is_in_stock } | Select-Object -First 1
    if (-not $product) { throw 'No purchasable simple product available.' }
    $cart = Send-CartRequest '/cart/add-item' @{ id=$product.id; quantity=1 }
    $addedKey = $cart.items[0].key
    $cart = Send-CartRequest '/cart/update-item' @{ key=$addedKey; quantity=2 }
    if ($cart.items[0].quantity -ne 2) { throw 'Quantity update failed.' }
    $checkout = $client.GetAsync("$WordPress/checkout/").GetAwaiter().GetResult()
    try {
        $html = $checkout.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        if (-not $checkout.IsSuccessStatusCode -or $html -notmatch 'wp-block-woocommerce-checkout') { throw 'Native checkout was not available.' }
    } finally { $checkout.Dispose() }
    $cart = Send-CartRequest '/cart'
    if ($cart.items[0].key -ne $addedKey -or $cart.items[0].quantity -ne 2) { throw 'Guest cart was not preserved across the native checkout request.' }
    Write-Output 'PASS HTTP guest cart: add, quantity update, native checkout request, cookie-session preservation.'
} finally {
    if ($addedKey) {
        $cart = Send-CartRequest '/cart/remove-item' @{ key=$addedKey }
        if (@($cart.items).Count -ne 0) { throw 'Test guest cart cleanup was incomplete.' }
        Write-Output 'PASS removed the test item from the isolated guest cart; no order was placed.'
    }
    $client.Dispose()
    $handler.Dispose()
}
