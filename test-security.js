// 🔒 Quick Security Test Script
// Run this in your browser console to test basic security

console.log('🔒 Starting Security Tests...');

// Test 1: Check if sensitive data is exposed
console.log('📋 Test 1: Checking for exposed sensitive data...');
const sensitiveData = [
    'access_token',
    'refresh_token',
    'password',
    'secret',
    'key'
];

sensitiveData.forEach(item => {
    if (localStorage.getItem(item)) {
        console.log(`⚠️  WARNING: ${item} found in localStorage`);
    } else {
        console.log(`✅ ${item} not exposed in localStorage`);
    }
});

// Test 2: Check for XSS vulnerabilities in current page
console.log('📋 Test 2: Checking for XSS vulnerabilities...');
const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    'javascript:alert("XSS")'
];

xssPayloads.forEach(payload => {
    if (document.body.innerHTML.includes(payload)) {
        console.log(`❌ XSS VULNERABILITY: ${payload} found in page`);
    } else {
        console.log(`✅ XSS payload ${payload} not found`);
    }
});

// Test 3: Check authentication status
console.log('📋 Test 3: Checking authentication status...');
const token = localStorage.getItem('access_token');
if (token) {
    console.log('✅ User is authenticated');
    console.log('🔍 Token length:', token.length);
} else {
    console.log('ℹ️  User is not authenticated');
}

// Test 4: Check for exposed API endpoints
console.log('📋 Test 4: Checking for exposed API information...');
const scripts = document.querySelectorAll('script');
let apiExposed = false;
scripts.forEach(script => {
    if (script.src && script.src.includes('api')) {
        console.log('🔍 Found API script:', script.src);
        apiExposed = true;
    }
});

if (!apiExposed) {
    console.log('✅ No API endpoints exposed in scripts');
}

console.log('🔒 Security tests completed!');
console.log('📝 Check the results above for any security issues.');
