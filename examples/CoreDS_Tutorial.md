# CoreDS Tutorial: Building Domain-Specific Languages with Lexiparse

**CoreDS** (Core Domain Specific) is a foundational business language built on the Lexiparse platform. It provides a clean, extensible starting point for creating domain-specific languages (DSLs) tailored to specific business needs.

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Core Concepts](#core-concepts)
4. [Standard Library](#standard-library)
5. [Grammar Foundation](#grammar-foundation)
6. [Extension System](#extension-system)
7. [Building Custom Extensions](#building-custom-extensions)
8. [Domain-Specific Examples](#domain-specific-examples)
9. [Advanced Patterns](#advanced-patterns)
10. [Best Practices](#best-practices)
11. [Production Deployment](#production-deployment)

---

## Introduction

### What is CoreDS?

CoreDS is a **foundational business language** that serves as a starting point for building domain-specific languages. Rather than creating a language from scratch, you can extend CoreDS with your specific business vocabulary, functions, and logic patterns.

### Key Benefits

- **🚀 Fast Development** - Start with a working foundation instead of building from scratch
- **📚 Rich Standard Library** - 21+ built-in functions for common business operations
- **🔧 Flexible Extensions** - Add functions, keywords, data types, and complete modules
- **💼 Business-Friendly** - Natural syntax that business users can read and understand
- **🏢 Enterprise Ready** - Built on Lexiparse with production security and performance

### When to Use CoreDS

✅ **Perfect for:**
- Building business rules engines
- Creating domain-specific configuration languages
- Prototyping business logic systems
- Training non-technical users on business processes
- Standardizing business calculations across teams

❌ **Not ideal for:**
- General-purpose programming languages
- High-performance computational tasks
- Systems programming

---

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Basic JavaScript knowledge
- Understanding of your business domain

### Installation

```bash
# Clone the lexiparse repository
git clone https://github.com/Solifugus/lexiparse.git
cd lexiparse

# Install dependencies
npm install

# Run CoreDS demo
node examples/coreds.js
```

### Your First CoreDS Program

```javascript
const { CoreDS } = require('./coreds.js');

// Create a new CoreDS instance
const coreDS = new CoreDS();

// Get access to standard library functions
const stdlib = coreDS.getStandardLibrary();

// Use business functions
console.log('Tax calculation:', stdlib.calculate_tax(1000, 0.08)); // $80
console.log('After discount:', stdlib.apply_discount(1000, 15));   // $850
console.log('Currency format:', stdlib.format_currency(1234.56)); // $1,234.56
```

---

## Core Concepts

### Architecture Overview

```
┌─────────────────────────────────────┐
│           Your Domain DSL           │  ← Your custom language
├─────────────────────────────────────┤
│         CoreDS Extensions           │  ← Domain-specific additions
├─────────────────────────────────────┤
│        CoreDS Foundation            │  ← Standard library & grammar
├─────────────────────────────────────┤
│         Lexiparse Engine            │  ← Parsing & execution engine
└─────────────────────────────────────┘
```

### Core Components

1. **Grammar Foundation** - Defines the basic syntax and language structures
2. **Standard Library** - Essential functions for business operations
3. **Extension System** - Framework for adding domain-specific capabilities
4. **Execution Engine** - Lexiparse parser with enterprise features

---

## Standard Library

CoreDS comes with 21 built-in functions organized into categories:

### Mathematical Functions

```javascript
const stdlib = coreDS.getStandardLibrary();

// Rounding and precision
stdlib.round(123.456, 2)        // 123.46

// Percentages
stdlib.percentage(25, 100)       // 25.0

// Min/Max operations
stdlib.min(10, 5, 8, 15)        // 5
stdlib.max(10, 5, 8, 15)        // 15

// Array operations
stdlib.sum([10, 20, 30])        // 60
stdlib.average([10, 20, 30])    // 20
```

### Text Functions

```javascript
// Case conversion
stdlib.uppercase("hello world")  // "HELLO WORLD"
stdlib.lowercase("HELLO WORLD")  // "hello world"

// Text searching
stdlib.contains("Hello World", "World")  // true

// Currency formatting
stdlib.format_currency(1234.56) // "$1,234.56"
```

### Date Functions

```javascript
// Current date
stdlib.today()                   // "2024-01-15"

// Date arithmetic
stdlib.add_days("2024-01-01", 30)           // "2024-01-31"
stdlib.days_between("2024-01-01", "2024-01-31")  // 30

// Date formatting
stdlib.format_date("2024-01-15", "MM/DD/YYYY")   // "01/15/2024"
```

### Validation Functions

```javascript
// Numeric validation
stdlib.is_positive(150)          // true
stdlib.is_within_range(75, 0, 100)  // true

// Data validation
stdlib.is_valid_email("user@domain.com")  // true
stdlib.is_valid_date("2024-01-15")        // true
```

### Business Functions

```javascript
// Tax calculations
stdlib.calculate_tax(1000, 0.08)     // 80

// Discount applications
stdlib.apply_discount(1000, 15)      // 850

// Interest calculations
stdlib.compound_interest(1000, 0.05, 3)  // 1157.625
```

---

## Grammar Foundation

CoreDS provides a complete grammar foundation that you can build upon:

### Basic Language Elements

```javascript
// Variable assignments
customer_name = "John Doe"
order_total = 1299.99
tax_rate = 0.08

// Expressions and calculations
final_total = order_total + calculate_tax(order_total, tax_rate)

// Conditional logic
if (order_total > 1000) {
    discount_rate = 10
    discounted_total = apply_discount(order_total, discount_rate)
}

// Function definitions
function calculate_shipping(weight, distance) {
    base_rate = 5.00
    return base_rate + (weight * 0.5) + (distance * 0.1)
}
```

### Supported Data Types

- **Numbers** - `123`, `45.67`
- **Strings** - `"Hello World"`
- **Variables** - `customer_name`, `order_total`
- **Expressions** - Mathematical and logical operations
- **Functions** - Both built-in and custom definitions

---

## Extension System

CoreDS provides four types of extensions:

### 1. Function Extensions

Add custom business logic functions:

```javascript
coreDS.extend({
    functions: {
        calculate_loyalty_points: function(purchaseAmount, tier) {
            const multipliers = { bronze: 1, silver: 1.5, gold: 2, platinum: 3 };
            return Math.floor(purchaseAmount * (multipliers[tier] || 1));
        },
        
        shipping_cost: function(weight, zone) {
            const baseRates = { domestic: 5, international: 15 };
            return (baseRates[zone] || baseRates.domestic) + (weight * 0.5);
        }
    }
});
```

### 2. Keyword Extensions

Add domain-specific vocabulary:

```javascript
coreDS.extend({
    keywords: ['customer', 'order', 'inventory', 'shipment', 'loyalty']
});
```

### 3. Data Type Extensions

Add custom validation for business data:

```javascript
coreDS.extend({
    dataTypes: {
        customer_id: function(value) {
            return /^CUST\d{6}$/.test(value);
        },
        
        product_sku: function(value) {
            return /^[A-Z]{3}\d{4}[A-Z]$/.test(value);
        }
    }
});
```

### 4. Module Extensions

Add complete domain packages:

```javascript
const ecommerceModule = {
    name: 'ecommerce',
    functions: {
        calculate_shipping: function(weight, zone) { /* ... */ },
        apply_coupon: function(total, couponCode) { /* ... */ },
        calculate_loyalty_points: function(amount, tier) { /* ... */ }
    },
    keywords: ['cart', 'checkout', 'shipping', 'coupon', 'loyalty'],
    dataTypes: {
        order_id: function(value) { return /^ORD\d{8}$/.test(value); }
    }
};

coreDS.extend({ module: ecommerceModule });
```

---

## Building Custom Extensions

### Step 1: Identify Domain Requirements

Before building extensions, analyze your domain:

```javascript
// Healthcare example - what concepts do we need?
const healthcareConcepts = {
    entities: ['patient', 'provider', 'claim', 'coverage'],
    calculations: ['copay', 'deductible', 'coinsurance'],
    validations: ['patient_id', 'npi_number', 'diagnosis_code'],
    workflows: ['eligibility_check', 'prior_authorization']
};
```

### Step 2: Design Your Functions

Create functions that solve real business problems:

```javascript
const healthcareFunctions = {
    // Calculate patient copay
    calculate_copay: function(serviceAmount, copayPercent, maxCopay = Infinity) {
        const copay = serviceAmount * (copayPercent / 100);
        return Math.min(copay, maxCopay);
    },
    
    // Check if patient meets deductible
    check_deductible_met: function(yearToDate, annualDeductible) {
        return yearToDate >= annualDeductible;
    },
    
    // Calculate insurance payment
    insurance_payment: function(chargedAmount, allowedAmount, coinsurance, deductibleMet) {
        const payableAmount = Math.min(chargedAmount, allowedAmount);
        
        if (!deductibleMet) {
            return 0; // Patient pays until deductible is met
        }
        
        return payableAmount * (coinsurance / 100);
    },
    
    // Validate National Provider Identifier
    validate_npi: function(npi) {
        return /^\d{10}$/.test(npi);
    }
};
```

### Step 3: Add Domain Vocabulary

Define keywords that business users will recognize:

```javascript
const healthcareKeywords = [
    'patient', 'provider', 'claim', 'coverage',
    'copay', 'deductible', 'coinsurance', 'premium',
    'eligibility', 'authorization', 'diagnosis', 'procedure',
    'network', 'formulary', 'prior_auth', 'appeal'
];
```

### Step 4: Create Validation Rules

Add data type validation for business entities:

```javascript
const healthcareDataTypes = {
    patient_id: function(value) {
        return /^P\d{8}$/.test(value); // Format: P12345678
    },
    
    claim_id: function(value) {
        return /^CLM\d{10}$/.test(value); // Format: CLM1234567890
    },
    
    diagnosis_code: function(value) {
        return /^[A-Z]\d{2}(\.\d{1,2})?$/.test(value); // ICD-10 format
    },
    
    procedure_code: function(value) {
        return /^\d{5}$/.test(value); // CPT code format
    }
};
```

### Step 5: Assemble the Module

```javascript
const healthcareModule = {
    name: 'healthcare',
    functions: healthcareFunctions,
    keywords: healthcareKeywords,
    dataTypes: healthcareDataTypes
};

// Apply to CoreDS
coreDS.extend({ module: healthcareModule });
```

---

## Domain-Specific Examples

### Example 1: E-commerce DSL

```javascript
const { CoreDS } = require('./coreds.js');
const coreDS = new CoreDS();

// E-commerce extension
const ecommerceModule = {
    name: 'ecommerce',
    functions: {
        calculate_shipping: function(weight, zone, expedited = false) {
            const baseRates = { 
                domestic: expedited ? 15 : 8, 
                international: expedited ? 40 : 25 
            };
            const weightCharge = weight > 5 ? (weight - 5) * 2 : 0;
            return (baseRates[zone] || baseRates.domestic) + weightCharge;
        },
        
        apply_bulk_discount: function(quantity, unitPrice) {
            if (quantity >= 100) return unitPrice * 0.85;      // 15% discount
            if (quantity >= 50) return unitPrice * 0.90;       // 10% discount  
            if (quantity >= 20) return unitPrice * 0.95;       // 5% discount
            return unitPrice;
        },
        
        calculate_loyalty_tier: function(yearlySpend) {
            if (yearlySpend >= 10000) return 'platinum';
            if (yearlySpend >= 5000) return 'gold';
            if (yearlySpend >= 1000) return 'silver';
            return 'bronze';
        },
        
        estimate_delivery: function(zone, expedited = false) {
            const deliveryDays = {
                domestic: expedited ? 1 : 5,
                international: expedited ? 3 : 14
            };
            
            const today = new Date();
            today.setDate(today.getDate() + deliveryDays[zone]);
            return today.toISOString().split('T')[0];
        }
    },
    keywords: ['cart', 'checkout', 'shipping', 'inventory', 'customer', 'order']
};

coreDS.extend({ module: ecommerceModule });

// Usage example
const stdlib = coreDS.getStandardLibrary();

console.log('\n🛒 E-COMMERCE EXAMPLE');
console.log('='.repeat(30));

const orderQuantity = 75;
const unitPrice = 29.99;
const customerWeight = 3.2;
const shippingZone = 'domestic';
const yearlySpend = 6500;

const discountedPrice = stdlib.apply_bulk_discount(orderQuantity, unitPrice);
const subtotal = discountedPrice * orderQuantity;
const shipping = stdlib.calculate_shipping(customerWeight, shippingZone);
const tax = stdlib.calculate_tax(subtotal, 0.08);
const total = subtotal + shipping + tax;
const loyaltyTier = stdlib.calculate_loyalty_tier(yearlySpend);
const deliveryDate = stdlib.estimate_delivery(shippingZone);

console.log(`Order: ${orderQuantity} units at ${stdlib.format_currency(unitPrice)} each`);
console.log(`Bulk price: ${stdlib.format_currency(discountedPrice)} per unit`);
console.log(`Subtotal: ${stdlib.format_currency(subtotal)}`);
console.log(`Shipping: ${stdlib.format_currency(shipping)}`);
console.log(`Tax: ${stdlib.format_currency(tax)}`);
console.log(`Total: ${stdlib.format_currency(total)}`);
console.log(`Customer tier: ${loyaltyTier}`);
console.log(`Estimated delivery: ${deliveryDate}`);
```

### Example 2: HR/Payroll DSL

```javascript
const hrModule = {
    name: 'hr_payroll',
    functions: {
        calculate_gross_pay: function(hoursWorked, hourlyRate, overtimeRate = 1.5) {
            const regularHours = Math.min(hoursWorked, 40);
            const overtimeHours = Math.max(hoursWorked - 40, 0);
            
            return (regularHours * hourlyRate) + (overtimeHours * hourlyRate * overtimeRate);
        },
        
        calculate_pto_accrual: function(hoursWorked, accrualRate = 0.0385) {
            return hoursWorked * accrualRate; // ~2 weeks per year
        },
        
        calculate_401k_match: function(grossPay, employeeContrib, maxMatch = 0.06) {
            const maxContrib = grossPay * maxMatch;
            return Math.min(employeeContrib, maxContrib);
        },
        
        determine_pay_grade: function(yearsExperience, performanceRating) {
            let baseGrade = Math.floor(yearsExperience / 2) + 1;
            
            // Adjust for performance
            if (performanceRating >= 4.5) baseGrade += 1;
            else if (performanceRating < 3.0) baseGrade -= 1;
            
            return Math.max(1, Math.min(baseGrade, 10)); // Cap at grades 1-10
        },
        
        calculate_health_premium: function(planType, familySize, employerContrib = 0.8) {
            const premiums = {
                basic: { individual: 200, family: 500 },
                standard: { individual: 300, family: 750 },
                premium: { individual: 450, family: 1100 }
            };
            
            const planCost = familySize > 1 ? 
                premiums[planType].family : 
                premiums[planType].individual;
                
            return planCost * (1 - employerContrib);
        }
    },
    keywords: ['employee', 'payroll', 'benefits', 'pto', 'overtime', '401k', 'health']
};

coreDS.extend({ module: hrModule });

// Usage example
console.log('\n👥 HR/PAYROLL EXAMPLE');
console.log('='.repeat(30));

const hoursWorked = 45;
const hourlyRate = 25.50;
const employeeContrib = 200;
const performanceRating = 4.2;
const yearsExperience = 6;

const grossPay = stdlib.calculate_gross_pay(hoursWorked, hourlyRate);
const ptoAccrued = stdlib.calculate_pto_accrual(hoursWorked);
const match401k = stdlib.calculate_401k_match(grossPay, employeeContrib);
const payGrade = stdlib.determine_pay_grade(yearsExperience, performanceRating);
const healthPremium = stdlib.calculate_health_premium('standard', 3);

console.log(`Hours worked: ${hoursWorked} (5 hours overtime)`);
console.log(`Gross pay: ${stdlib.format_currency(grossPay)}`);
console.log(`PTO accrued: ${ptoAccrued.toFixed(2)} hours`);
console.log(`401k match: ${stdlib.format_currency(match401k)}`);
console.log(`Pay grade: ${payGrade}`);
console.log(`Health premium: ${stdlib.format_currency(healthPremium)}/month`);
```

### Example 3: Financial DSL

```javascript
const financeModule = {
    name: 'finance',
    functions: {
        calculate_monthly_payment: function(principal, annualRate, years) {
            const monthlyRate = annualRate / 12;
            const payments = years * 12;
            
            return (principal * monthlyRate * Math.pow(1 + monthlyRate, payments)) /
                   (Math.pow(1 + monthlyRate, payments) - 1);
        },
        
        calculate_npv: function(cashFlows, discountRate) {
            return cashFlows.reduce((npv, cashFlow, period) => {
                return npv + (cashFlow / Math.pow(1 + discountRate, period));
            }, 0);
        },
        
        calculate_irr: function(cashFlows, guess = 0.1) {
            // Simplified IRR calculation using Newton-Raphson method
            let rate = guess;
            
            for (let i = 0; i < 100; i++) {
                const npv = this.calculate_npv(cashFlows, rate);
                const derivative = cashFlows.reduce((sum, cf, period) => {
                    return sum - (period * cf) / Math.pow(1 + rate, period + 1);
                }, 0);
                
                const newRate = rate - (npv / derivative);
                
                if (Math.abs(newRate - rate) < 0.0001) {
                    return newRate;
                }
                
                rate = newRate;
            }
            
            return rate;
        },
        
        calculate_roi: function(gain, cost) {
            return ((gain - cost) / cost) * 100;
        },
        
        present_value: function(futureValue, rate, periods) {
            return futureValue / Math.pow(1 + rate, periods);
        },
        
        future_value: function(presentValue, rate, periods) {
            return presentValue * Math.pow(1 + rate, periods);
        }
    },
    keywords: ['principal', 'interest', 'npv', 'irr', 'roi', 'cashflow', 'discount']
};

coreDS.extend({ module: financeModule });

// Usage example  
console.log('\n💰 FINANCE EXAMPLE');
console.log('='.repeat(30));

const loanPrincipal = 250000;
const annualRate = 0.045;
const loanYears = 30;
const cashFlows = [-100000, 30000, 35000, 40000, 45000];

const monthlyPayment = stdlib.calculate_monthly_payment(loanPrincipal, annualRate, loanYears);
const npv = stdlib.calculate_npv(cashFlows, 0.08);
const irr = stdlib.calculate_irr(cashFlows);
const roi = stdlib.calculate_roi(45000, 35000);
const futureValue = stdlib.future_value(10000, 0.07, 10);

console.log(`Loan amount: ${stdlib.format_currency(loanPrincipal)}`);
console.log(`Monthly payment: ${stdlib.format_currency(monthlyPayment)}`);
console.log(`Project NPV: ${stdlib.format_currency(npv)}`);
console.log(`Project IRR: ${stdlib.percentage(irr * 100, 1).toFixed(1)}%`);
console.log(`Investment ROI: ${roi.toFixed(1)}%`);
console.log(`Future value of $10k: ${stdlib.format_currency(futureValue)}`);
```

---

## Advanced Patterns

### Chaining Extensions

Build complex domains by combining multiple extensions:

```javascript
// Base retail module
const retailBaseModule = { /* core retail functions */ };

// Inventory management extension  
const inventoryModule = { /* inventory-specific functions */ };

// Customer loyalty extension
const loyaltyModule = { /* loyalty program functions */ };

// Apply in order
coreDS.extend({ module: retailBaseModule });
coreDS.extend({ module: inventoryModule });
coreDS.extend({ module: loyaltyModule });
```

### Dynamic Extensions

Load extensions based on configuration:

```javascript
class BusinessDSL extends CoreDS {
    constructor(domain, config = {}) {
        super(config);
        
        // Load domain-specific modules
        this.loadDomainModules(domain);
        
        // Apply custom configuration
        if (config.customFunctions) {
            this.extend({ functions: config.customFunctions });
        }
    }
    
    loadDomainModules(domain) {
        const domainModules = {
            'healthcare': [healthcareModule, medicalBillingModule],
            'finance': [financeModule, bankingModule, investmentModule],
            'ecommerce': [ecommerceModule, inventoryModule, shippingModule],
            'hr': [hrModule, payrollModule, benefitsModule]
        };
        
        if (domainModules[domain]) {
            domainModules[domain].forEach(module => {
                this.extend({ module });
            });
        }
    }
}

// Usage
const healthcareDSL = new BusinessDSL('healthcare');
const financeDSL = new BusinessDSL('finance');
```

### Extension Validation

Add runtime validation for extensions:

```javascript
class ValidatedCoreDS extends CoreDS {
    extend(extensionConfig) {
        // Validate extension configuration
        this.validateExtension(extensionConfig);
        
        // Apply extension
        super.extend(extensionConfig);
    }
    
    validateExtension(config) {
        if (config.functions) {
            Object.entries(config.functions).forEach(([name, func]) => {
                if (typeof func !== 'function') {
                    throw new Error(`Extension function '${name}' must be a function`);
                }
                
                if (this.parser.binding[name]) {
                    console.warn(`⚠️  Overriding existing function: ${name}`);
                }
            });
        }
        
        if (config.keywords) {
            config.keywords.forEach(keyword => {
                if (typeof keyword !== 'string') {
                    throw new Error(`Keywords must be strings, got: ${keyword}`);
                }
            });
        }
    }
}
```

### Performance Optimization

Optimize extensions for production use:

```javascript
class OptimizedCoreDS extends CoreDS {
    constructor(options = {}) {
        super(options);
        
        // Function caching for expensive operations
        this.functionCache = new Map();
        this.enableCaching = options.enableCaching || false;
    }
    
    // Cached function wrapper
    cachedFunction(name, originalFunction) {
        return (...args) => {
            if (!this.enableCaching) {
                return originalFunction.apply(this, args);
            }
            
            const key = `${name}:${JSON.stringify(args)}`;
            
            if (this.functionCache.has(key)) {
                return this.functionCache.get(key);
            }
            
            const result = originalFunction.apply(this, args);
            this.functionCache.set(key, result);
            
            return result;
        };
    }
    
    extend(extensionConfig) {
        if (extensionConfig.functions) {
            // Wrap expensive functions with caching
            const wrappedFunctions = {};
            
            Object.entries(extensionConfig.functions).forEach(([name, func]) => {
                // Check if function should be cached (heuristic: complex calculations)
                const shouldCache = this.shouldCacheFunction(name, func);
                
                wrappedFunctions[name] = shouldCache ? 
                    this.cachedFunction(name, func) : 
                    func;
            });
            
            extensionConfig.functions = wrappedFunctions;
        }
        
        super.extend(extensionConfig);
    }
    
    shouldCacheFunction(name, func) {
        // Cache functions with certain patterns in their names
        const cachePatterns = [
            'calculate', 'compute', 'analyze', 'process',
            'transform', 'convert', 'format'
        ];
        
        return cachePatterns.some(pattern => name.toLowerCase().includes(pattern));
    }
}
```

---

## Best Practices

### 1. Function Naming Conventions

```javascript
// ✅ Good: Clear, descriptive names
calculate_monthly_payment()
validate_customer_id()
format_phone_number()
apply_bulk_discount()

// ❌ Avoid: Vague or abbreviated names
calc()
validate()
format()
discount()
```

### 2. Parameter Validation

```javascript
// ✅ Good: Validate inputs
calculate_tax: function(amount, rate) {
    if (typeof amount !== 'number' || amount < 0) {
        throw new Error('Amount must be a positive number');
    }
    
    if (typeof rate !== 'number' || rate < 0 || rate > 1) {
        throw new Error('Tax rate must be between 0 and 1');
    }
    
    return amount * rate;
}
```

### 3. Error Handling

```javascript
// ✅ Good: Business-friendly error messages
validate_employee_id: function(employeeId) {
    if (!employeeId || typeof employeeId !== 'string') {
        throw new Error('Employee ID is required and must be a text value');
    }
    
    if (!/^EMP\d{6}$/.test(employeeId)) {
        throw new Error('Employee ID must follow format EMP123456 (EMP + 6 digits)');
    }
    
    return true;
}
```

### 4. Documentation Standards

```javascript
const documentedModule = {
    name: 'well_documented',
    functions: {
        /**
         * Calculate compound interest for investment planning
         * @param {number} principal - Initial investment amount
         * @param {number} rate - Annual interest rate (as decimal, e.g., 0.05 for 5%)
         * @param {number} time - Investment period in years
         * @param {number} compound - Compounding frequency per year (default: 1)
         * @returns {number} Final amount after compound interest
         * @example
         * // Calculate $1000 invested at 5% for 3 years, compounded annually
         * compound_interest(1000, 0.05, 3) // Returns 1157.625
         */
        compound_interest: function(principal, rate, time, compound = 1) {
            // Validate inputs
            if (principal <= 0) throw new Error('Principal must be positive');
            if (rate < 0) throw new Error('Interest rate cannot be negative');
            if (time <= 0) throw new Error('Time period must be positive');
            
            // Calculate compound interest: A = P(1 + r/n)^(nt)
            return principal * Math.pow(1 + (rate / compound), compound * time);
        }
    }
};
```

### 5. Testing Your Extensions

```javascript
// Create test utilities
function testCoreDS() {
    const coreDS = new CoreDS();
    
    // Load your extension
    coreDS.extend({ module: yourModule });
    
    const stdlib = coreDS.getStandardLibrary();
    
    // Test cases
    const tests = [
        {
            name: 'Basic calculation',
            test: () => stdlib.your_function(100, 0.1),
            expected: 110
        },
        {
            name: 'Edge case: zero input',
            test: () => stdlib.your_function(0, 0.1),
            expected: 0
        },
        {
            name: 'Validation: negative input should throw',
            test: () => stdlib.your_function(-100, 0.1),
            shouldThrow: true
        }
    ];
    
    // Run tests
    tests.forEach(test => {
        try {
            const result = test.test();
            
            if (test.shouldThrow) {
                console.log(`❌ ${test.name}: Expected error but got ${result}`);
            } else if (result === test.expected) {
                console.log(`✅ ${test.name}: PASSED`);
            } else {
                console.log(`❌ ${test.name}: Expected ${test.expected}, got ${result}`);
            }
        } catch (error) {
            if (test.shouldThrow) {
                console.log(`✅ ${test.name}: PASSED (correctly threw error)`);
            } else {
                console.log(`❌ ${test.name}: Unexpected error: ${error.message}`);
            }
        }
    });
}
```

### 6. Version Management

```javascript
// Version your extensions
const myModule = {
    name: 'my_business_module',
    version: '1.2.0',
    description: 'Customer management and analytics functions',
    functions: {
        // Your functions here
    },
    
    // Check compatibility
    requiresCoreDS: '1.0.0',
    compatibleWith: ['lexiparse@1.0.0+']
};
```

---

## Production Deployment

### Security Considerations

```javascript
// Production-ready CoreDS configuration
const productionCoreDS = new CoreDS({
    securityMode: 'strict',           // Enable security restrictions
    enableScoping: true,              // Isolate variable scopes
    collectErrors: true,              // Comprehensive error tracking
    attemptRecovery: true,            // Graceful error recovery
    enableCaching: true,              // Performance optimization
    maxExecutionTime: 5000,           // Prevent infinite loops
    maxMemoryUsage: '50MB'            // Memory limits
});

// Validate all extensions before deployment
productionCoreDS.validateExtensions = true;
```

### Performance Monitoring

```javascript
class MonitoredCoreDS extends CoreDS {
    constructor(options = {}) {
        super(options);
        this.metrics = {
            functionCalls: new Map(),
            executionTimes: new Map(),
            errorCounts: new Map()
        };
    }
    
    run(code) {
        const startTime = Date.now();
        
        try {
            const result = super.run(code);
            const executionTime = Date.now() - startTime;
            
            // Record metrics
            this.recordMetric('execution_time', executionTime);
            this.recordMetric('successful_runs', 1);
            
            return result;
        } catch (error) {
            this.recordMetric('error_count', 1);
            this.recordMetric(`error_${error.constructor.name}`, 1);
            
            throw error;
        }
    }
    
    recordMetric(name, value) {
        const current = this.metrics.get(name) || 0;
        this.metrics.set(name, current + value);
    }
    
    getMetrics() {
        return Object.fromEntries(this.metrics);
    }
}
```

### Environment Configuration

```javascript
// config/development.js
module.exports = {
    coreDS: {
        securityMode: 'permissive',
        enableDebugging: true,
        logLevel: 'debug',
        enableCaching: false
    }
};

// config/production.js
module.exports = {
    coreDS: {
        securityMode: 'strict',
        enableDebugging: false,
        logLevel: 'error',
        enableCaching: true,
        rateLimit: {
            maxRequests: 1000,
            windowMs: 60000
        }
    }
};

// Usage
const config = require(`./config/${process.env.NODE_ENV || 'development'}`);
const coreDS = new CoreDS(config.coreDS);
```

---

## Conclusion

CoreDS provides a powerful foundation for building domain-specific languages that business users can understand and maintain. By following this tutorial, you can:

1. **Start quickly** with the built-in standard library
2. **Extend systematically** with domain-specific functions and vocabulary  
3. **Scale efficiently** using best practices and patterns
4. **Deploy confidently** with production-ready configurations

### Next Steps

1. **Experiment** - Try the examples and modify them for your domain
2. **Plan** - Identify the key concepts and operations in your business domain
3. **Build** - Create your first custom extension using the patterns shown
4. **Test** - Validate your extension with comprehensive test cases
5. **Deploy** - Use production best practices for security and performance

### Resources

- **Examples**: See `examples/` directory for working implementations
- **Tests**: Check `tests/` directory for comprehensive test suites
- **Lexiparse**: Refer to main documentation for platform features
- **Community**: Join discussions on GitHub for support and ideas

---

**Happy Domain Modeling! 🚀**

*CoreDS makes it easy to turn business knowledge into executable, maintainable code.*