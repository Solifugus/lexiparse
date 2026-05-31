#!/usr/bin/env node

/**
 * Test Runner for Lexiparse Enterprise Business DSL Platform
 *
 * Runs all test suites and examples in the proper order
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎯 Lexiparse Enterprise Business DSL Platform - Test Suite');
console.log('='.repeat(60));

// Function to run a test file and capture results
function runTest(testFile, category) {
    const fullPath = path.join(__dirname, testFile);

    if (!fs.existsSync(fullPath)) {
        console.log(`⚠️  Test file not found: ${testFile}`);
        return false;
    }

    console.log(`\n🚀 Running ${category}: ${path.basename(testFile)}`);
    console.log('-'.repeat(40));

    try {
        execSync(`node "${fullPath}"`, {
            stdio: 'inherit',
            cwd: __dirname
        });
        console.log(`✅ ${category} PASSED: ${path.basename(testFile)}`);
        return true;
    } catch (error) {
        console.log(`❌ ${category} FAILED: ${path.basename(testFile)}`);
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

// Test categories and files
const testCategories = [
    {
        name: 'Core Language Tests',
        tests: [
            'tests/phase2_test.js',
            'tests/scoping_basic_test.js',
            'tests/scoping_test.js',
            'tests/external_test.js'
        ]
    },
    {
        name: 'Feature-Specific Tests',
        tests: [
            'tests/string_test.js',
            'tests/date_test.js',
            'tests/phase2_comprehensive_test.js'
        ]
    },
    {
        name: 'Production Features',
        tests: [
            'tests/phase3_production_test.js',
            'tests/enterprise_integration_test.js'
        ]
    },
    {
        name: 'Developer Experience',
        tests: [
            'tests/phase4_developer_experience_test.js'
        ]
    },
    {
        name: 'Examples & Demos',
        tests: [
            'examples/bizscript_demo.js',
            'examples/error_demo.js'
        ]
    }
];

// Track results
let totalTests = 0;
let passedTests = 0;
const results = {};

// Run all test categories
for (const category of testCategories) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 ${category.name.toUpperCase()}`);
    console.log(`${'='.repeat(60)}`);

    const categoryResults = [];

    for (const testFile of category.tests) {
        totalTests++;
        const passed = runTest(testFile, category.name);
        if (passed) passedTests++;
        categoryResults.push({ file: testFile, passed });
    }

    results[category.name] = categoryResults;
}

// Summary report
console.log(`\n${'='.repeat(60)}`);
console.log('📊 TEST EXECUTION SUMMARY');
console.log(`${'='.repeat(60)}`);

for (const [categoryName, categoryResults] of Object.entries(results)) {
    const passed = categoryResults.filter(r => r.passed).length;
    const total = categoryResults.length;
    const status = passed === total ? '✅ PASS' : '❌ FAIL';

    console.log(`\n${status} ${categoryName}: ${passed}/${total}`);

    for (const result of categoryResults) {
        const status = result.passed ? '✅' : '❌';
        console.log(`   ${status} ${path.basename(result.file)}`);
    }
}

console.log(`\n🎯 OVERALL RESULTS: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED! Lexiparse Enterprise Platform is ready for production.');
    process.exit(0);
} else {
    console.log(`⚠️  ${totalTests - passedTests} test(s) failed. Please review the errors above.`);
    process.exit(1);
}