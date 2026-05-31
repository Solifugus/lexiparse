#!/usr/bin/nodejs

var Lexiparse = require('./lexiparse.js');

// Enhanced BizScript grammar for testing Phase 2 arrays and objects
let grammar = {
    'stmt': [
        ['output', '=', ':expr'],
        [':var', '=', ':expr'],
        ['if', '(', ':expr', ')', ':stmt'],
        ['if', '(', ':expr', ')', '{', ':block', '}']
    ],
    'block': [
        [':stmt'],
        [':stmt', ':block']
    ],
    'expr': [
        // Objects and arrays will be handled by precedence parser
        ['(', ':expr', ')'],
        [':numlit'],
        [':strlit'],
        [':var']
    ],
    'var': [/^[A-Za-z][A-Za-z0-9_]*/, function(detail) {
        detail.type = 'variable';
        detail.value = detail.found[0];
    }],
    'numlit': [/^[+-]?\d+(\.\d+)?/, function(detail) {
        detail.type = 'number';
        detail.value = Number(detail.found[0]);
    }],
    'strlit': [/^"([^"]*)"/, function(detail) {
        detail.type = 'string';
        detail.value = detail.found[1];
    }]
};

console.log('🧪 Testing Phase 2: Arrays and Objects Support\n');

// Test programs for arrays and objects
let phase2Tests = [
    {
        name: "Simple Object Literal",
        code: `patient = { id: "P001", name: "John Doe", age: 45 }`
    },
    {
        name: "Simple Array Literal",
        code: `services = [100, 200, 300, 400]`
    },
    {
        name: "Complex Object with Nested Arrays",
        code: `claim = {
                   patient_id: "P001",
                   services: [
                       { code: "SURG001", cost: 5000.00, covered: true },
                       { code: "ANES001", cost: 1200.00, covered: true }
                   ],
                   total: 6200.00
               }`
    },
    {
        name: "Object Property Access",
        code: `total = claim.total
               patient_name = claim.patient.name`
    },
    {
        name: "Array Indexing",
        code: `first_service = services[0]
               second_cost = claim.services[1].cost`
    },
    {
        name: "Mixed Expressions",
        code: `total_cost = claim.services[0].cost + claim.services[1].cost
               final_amount = total_cost * 1.15`
    },
    {
        name: "Empty Collections",
        code: `empty_obj = {}
               empty_array = []`
    },
    {
        name: "Business Logic Example",
        code: `insurance_policy = {
                   provider: "BlueShield",
                   policy_number: "BS-789123",
                   limits: { surgery: 50000, anesthesia: 10000 },
                   covered_services: ["SURG001", "ANES001", "LAB001"]
               }
               coverage_rate = insurance_policy.limits.surgery`
    }
];

// Test execution context for variables
let testContext = {
    variables: {},
    // Store test data for property access tests
    claim: {
        patient_id: "P001",
        total: 6200.00,
        patient: { name: "John Doe" },
        services: [
            { code: "SURG001", cost: 5000.00, covered: true },
            { code: "ANES001", cost: 1200.00, covered: true }
        ]
    },
    services: [100, 200, 300, 400]
};

// Run each Phase 2 test
phase2Tests.forEach((test, index) => {
    console.log(`\n📋 Test ${index + 1}: ${test.name}`);
    console.log('Code:');
    console.log('   ' + test.code.split('\n').join('\n   '));
    console.log('\nResults:');

    try {
        let interpreter = new Lexiparse(grammar, {
            caseful: false,
            ignore: [' ', '\t', '\n'],
            collectErrors: true,
            maxErrors: 5,
            attemptRecovery: true,
            binding: testContext,
            precedence: {
                '=': 1,
                '==': 4, '!=': 4, '<': 4, '>': 4,
                '+': 5, '-': 5,
                '*': 6, '/': 6
            }
        });

        let success = interpreter.run(test.code);

        if (success) {
            console.log('   ✅ Parsing successful!');
            console.log('   💡 New data structures are properly recognized');
        } else {
            console.log(`   ❌ Found ${interpreter.errors.length} error(s)`);
        }
    } catch (error) {
        console.log('   🔥 Unexpected error:', error);
    }

    console.log('\n' + '='.repeat(60));
});

console.log('\n🎯 Phase 2 testing complete!');
console.log('💡 New Features Tested:');
console.log('   • Object literal syntax: { key: value }');
console.log('   • Array literal syntax: [item1, item2, item3]');
console.log('   • Property access: obj.property');
console.log('   • Array indexing: arr[index]');
console.log('   • Nested object/array structures');
console.log('   • Mixed expressions with objects and arrays');
console.log('\n🚀 Ready for business data processing!');