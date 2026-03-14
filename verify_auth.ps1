$ErrorActionPreference = 'Stop'
$baseUrl = "http://localhost:4000"

function Test-Endpoint($url, $expectStatus, $token=$null) {
    $headers = @{}
    if ($token) { $headers['Authorization'] = "Bearer $token" }
    try {
        $resp = Invoke-WebRequest -Uri $url -Headers $headers -Method GET -UseBasicParsing
        $actual = $resp.StatusCode
    } catch {
        $actual = $_.Exception.Response.StatusCode.value__
    }
    $passed = $actual -eq $expectStatus
    $icon = if ($passed) { "PASS" } else { "FAIL" }
    Write-Host "[$icon] $url => expected=$expectStatus actual=$actual"
    return $passed
}

Write-Host ""
Write-Host "============================================"
Write-Host "  BlockPay Auth Verification Suite"
Write-Host "============================================"
Write-Host ""

$allPassed = $true

# 1. Unprotected endpoints should return 401
Write-Host "--- Protected Routes (no token) ---"
if (-not (Test-Endpoint "$baseUrl/api/admin/stats"           401)) { $allPassed = $false }
if (-not (Test-Endpoint "$baseUrl/api/analytics/volume"      401)) { $allPassed = $false }
if (-not (Test-Endpoint "$baseUrl/api/analytics/fees"        401)) { $allPassed = $false }
if (-not (Test-Endpoint "$baseUrl/api/analytics/corridors"   401)) { $allPassed = $false }
if (-not (Test-Endpoint "$baseUrl/api/analytics/compliance"  401)) { $allPassed = $false }
if (-not (Test-Endpoint "$baseUrl/api/settlement"            401)) { $allPassed = $false }

Write-Host ""
Write-Host "--- Registration ---"
try {
    $regBody = '{"walletAddress":"0xverify000000000000000000000000000000000001","password":"VerifyPass!9"}'
    $regResp = Invoke-WebRequest -Uri "$baseUrl/api/auth/register" -Method POST `
        -ContentType "application/json" -Body $regBody -UseBasicParsing
    $regJson = $regResp.Content | ConvertFrom-Json
    if ($regJson.success -or $regJson.message -match "exist") {
        Write-Host "[PASS] Registration succeeded or user already exists"
    }
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400) {
        Write-Host "[PASS] Already registered (400 expected on re-register)"
    } else {
        Write-Host "[FAIL] Registration error: $_"
        $allPassed = $false
    }
}

Write-Host ""
Write-Host "--- Login ---"
$token = $null
try {
    $loginBody = '{"walletAddress":"0xverify000000000000000000000000000000000001","password":"VerifyPass!9"}'
    $loginResp = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST `
        -ContentType "application/json" -Body $loginBody -UseBasicParsing
    $loginJson = $loginResp.Content | ConvertFrom-Json
    $token = $loginJson.token
    if ($token) {
        Write-Host "[PASS] Login returned JWT token"
    } else {
        Write-Host "[FAIL] No token in login response"
        $allPassed = $false
    }
} catch {
    Write-Host "[FAIL] Login failed: $_"
    $allPassed = $false
}

Write-Host ""
Write-Host "--- Protected Routes (with token) ---"
if ($token) {
    if (-not (Test-Endpoint "$baseUrl/api/admin/stats"          200 $token)) { $allPassed = $false }
    if (-not (Test-Endpoint "$baseUrl/api/analytics/volume"     200 $token)) { $allPassed = $false }
    if (-not (Test-Endpoint "$baseUrl/api/analytics/fees"       200 $token)) { $allPassed = $false }
    if (-not (Test-Endpoint "$baseUrl/api/analytics/corridors"  200 $token)) { $allPassed = $false }
    if (-not (Test-Endpoint "$baseUrl/api/analytics/compliance" 200 $token)) { $allPassed = $false }
    if (-not (Test-Endpoint "$baseUrl/api/settlement"           200 $token)) { $allPassed = $false }
} else {
    Write-Host "[SKIP] No token — skipping authenticated tests"
    $allPassed = $false
}

Write-Host ""
Write-Host "============================================"
if ($allPassed) {
    Write-Host "  ALL TESTS PASSED"
} else {
    Write-Host "  SOME TESTS FAILED — check output above"
}
Write-Host "============================================"
Write-Host ""
