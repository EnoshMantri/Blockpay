$ErrorActionPreference = 'Stop'
$base = "http://localhost:4000"

function Req($method, $url, $body=$null, $token=$null) {
    $headers = @{ "Content-Type" = "application/json" }
    if ($token) { $headers["Authorization"] = "Bearer $token" }
    try {
        if ($body) {
            $r = Invoke-WebRequest -Uri $url -Method $method -Body ($body | ConvertTo-Json) -Headers $headers -UseBasicParsing
        } else {
            $r = Invoke-WebRequest -Uri $url -Method $method -Headers $headers -UseBasicParsing
        }
        return @{ status = $r.StatusCode; body = ($r.Content | ConvertFrom-Json) }
    } catch {
        $sc = $_.Exception.Response.StatusCode.value__
        try { $rb = ($_.ErrorDetails.Message | ConvertFrom-Json) } catch { $rb = $_.Exception.Message }
        return @{ status = $sc; body = $rb }
    }
}

function Check($label, $got, $expected) {
    $pass = $got -eq $expected
    $icon = if ($pass) { "PASS" } else { "FAIL" }
    Write-Host "[$icon] $label => expected=$expected actual=$got"
    return $pass
}

$all = $true
Write-Host ""
Write-Host "=========================================="
Write-Host "  BlockPay Role Auth Verification"
Write-Host "=========================================="

# ─── Seed admin ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "--- Admin Seeding ---"
$seed = Req "POST" "$base/api/auth/seed-admin" @{ email="admin@blockpay.io"; username="BlockPay Admin"; password="Admin1234!" }
if ($seed.status -eq 201 -or ($seed.status -eq 400 -and $seed.body.error -match "already exists")) {
    Write-Host "[PASS] Admin account ready ($($seed.status))"
} else {
    Write-Host "[FAIL] Seed admin: $($seed.status) $($seed.body)"
    $all = $false
}

# ─── Register regular user ────────────────────────────────────────────────────
Write-Host ""
Write-Host "--- Register Regular User ---"
$reg = Req "POST" "$base/api/auth/register" @{ email="user@test.com"; username="TestUser"; password="User1234!" }
if ($reg.status -eq 201 -or ($reg.status -eq 400 -and $reg.body.error -match "already exists")) {
    Write-Host "[PASS] Regular user ready ($($reg.status))"
} else {
    Write-Host "[FAIL] Register: $($reg.status) $($reg.body)"
    $all = $false
}

# ─── Login as regular user ────────────────────────────────────────────────────
Write-Host ""
Write-Host "--- Login ---"
$userLogin = Req "POST" "$base/api/auth/login" @{ email="user@test.com"; password="User1234!" }
$userToken = $userLogin.body.token
if ($userToken -and (Check "Regular user login" $userLogin.status 200)) {
    Write-Host "       Role in token: $($userLogin.body.user.role)"
} else {
    $all = $false
}

$adminLogin = Req "POST" "$base/api/auth/login" @{ email="admin@blockpay.io"; password="Admin1234!" }
$adminToken = $adminLogin.body.token
if ($adminToken -and (Check "Admin user login" $adminLogin.status 200)) {
    Write-Host "       Role in token: $($adminLogin.body.user.role)"
} else {
    $all = $false
}

# ─── Role enforcement ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "--- Role Enforcement on /api/admin/stats ---"
if (-not (Check "No token => 401" (Req "GET" "$base/api/admin/stats").status 401)) { $all = $false }
if (-not (Check "Regular user => 403" (Req "GET" "$base/api/admin/stats" $null $userToken).status 403)) { $all = $false }
if (-not (Check "Admin user => 200" (Req "GET" "$base/api/admin/stats" $null $adminToken).status 200)) { $all = $false }

# ─── Simulate transaction as regular user ────────────────────────────────────
Write-Host ""
Write-Host "--- Simulate Transaction (regular user) ---"
$sim = Req "POST" "$base/api/settlement/simulate" @{
    sender   = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    receiver = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    amount   = "100.00"
} $userToken
if (Check "Simulation returns 201" $sim.status 201) {
    Write-Host "       TX id: $($sim.body.record.id)"
    Write-Host "       Stages returned: $($sim.body.stages.Count)"
} else {
    write-host "       Error: $($sim.body)"
    $all = $false
}

Write-Host ""
Write-Host "=========================================="
if ($all) { Write-Host "  ALL TESTS PASSED" } else { Write-Host "  SOME TESTS FAILED" }
Write-Host "=========================================="
Write-Host ""
