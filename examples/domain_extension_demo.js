#!/usr/bin/env node

/**
 * Domain Extension Demo
 *
 * This example demonstrates how to extend CoreDS with domain-specific
 * functionality. Shows practical examples for E-commerce, HR, and Finance.
 *
 * Based on the comprehensive CoreDS Tutorial (CoreDS_Tutorial.md)
 */

const { CoreDS } = require('./coreds.js');

// =============================================================================
// E-COMMERCE DOMAIN EXTENSION
// =============================================================================

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

// =============================================================================
// HR/PAYROLL DOMAIN EXTENSION
// =============================================================================

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

// =============================================================================
// FINANCE DOMAIN EXTENSION
// =============================================================================

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

        calculate_roi: function(gain, cost) {
            return ((gain - cost) / cost) * 100;
        },

        present_value: function(futureValue, rate, periods) {
            return futureValue / Math.pow(1 + rate, periods);
        },

        future_value: function(presentValue, rate, periods) {
            return presentValue * Math.pow(1 + rate, periods);
        },

        amortization_schedule: function(principal, rate, periods) {
            // Calculate monthly payment inline
            const monthlyRate = rate / 12;
            const monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, periods)) / (Math.pow(1 + monthlyRate, periods) - 1);

            const schedule = [];
            let balance = principal;

            for (let month = 1; month <= periods; month++) {
                const interestPayment = balance * monthlyRate;
                const principalPayment = monthlyPayment - interestPayment;
                balance -= principalPayment;

                schedule.push({
                    month,
                    payment: monthlyPayment,
                    principal: principalPayment,
                    interest: interestPayment,
                    balance: Math.max(0, balance)
                });

                if (balance <= 0) break;
            }

            return schedule;
        }
    },
    keywords: ['principal', 'interest', 'npv', 'roi', 'cashflow', 'discount', 'amortization']
};

// =============================================================================
// DEMONSTRATION FUNCTION
// =============================================================================

function demonstrateDomainExtensions() {
    console.log('\n🎯 Domain Extension Demonstration');
    console.log('='.repeat(70));
    console.log('💡 This demo shows how to extend CoreDS for specific business domains');

    // Create three CoreDS instances for different domains
    const ecommerceDSL = new CoreDS();
    const hrDSL = new CoreDS();
    const financeDSL = new CoreDS();

    // Extend each with domain-specific capabilities
    ecommerceDSL.extend({ module: ecommerceModule });
    hrDSL.extend({ module: hrModule });
    financeDSL.extend({ module: financeModule });

    // =============================================================================
    // E-COMMERCE SCENARIO
    // =============================================================================

    console.log('\n🛒 E-COMMERCE SCENARIO: Bulk Order Processing');
    console.log('-'.repeat(50));

    // Get the full binding object which includes both standard library and extensions
    const elib = ecommerceDSL.getStandardLibrary();

    // Customer order data
    const order = {
        quantity: 75,
        unitPrice: 29.99,
        customerWeight: 3.2,
        shippingZone: 'domestic',
        yearlySpend: 6500,
        expedited: false
    };

    // Calculate order totals
    const discountedPrice = elib.apply_bulk_discount(order.quantity, order.unitPrice);
    const subtotal = discountedPrice * order.quantity;
    const shipping = elib.calculate_shipping(order.customerWeight, order.shippingZone, order.expedited);
    const tax = elib.calculate_tax(subtotal, 0.08);
    const total = subtotal + shipping + tax;
    const loyaltyTier = elib.calculate_loyalty_tier(order.yearlySpend);
    const deliveryDate = elib.estimate_delivery(order.shippingZone, order.expedited);

    console.log(`📦 Order: ${order.quantity} units at ${elib.format_currency(order.unitPrice)} each`);
    console.log(`💰 Bulk discount price: ${elib.format_currency(discountedPrice)} per unit (${((order.unitPrice - discountedPrice) / order.unitPrice * 100).toFixed(1)}% off)`);
    console.log(`📊 Subtotal: ${elib.format_currency(subtotal)}`);
    console.log(`🚚 Shipping: ${elib.format_currency(shipping)}`);
    console.log(`🧾 Tax: ${elib.format_currency(tax)}`);
    console.log(`💳 **Total: ${elib.format_currency(total)}**`);
    console.log(`⭐ Customer tier: ${loyaltyTier.toUpperCase()}`);
    console.log(`📅 Estimated delivery: ${deliveryDate}`);

    // =============================================================================
    // HR/PAYROLL SCENARIO
    // =============================================================================

    console.log('\n👥 HR/PAYROLL SCENARIO: Employee Payroll Processing');
    console.log('-'.repeat(50));

    // Get the full binding object which includes both standard library and extensions
    const hrlib = hrDSL.getStandardLibrary();

    // Employee data
    const employee = {
        hoursWorked: 45,
        hourlyRate: 25.50,
        employeeContrib: 200,
        performanceRating: 4.2,
        yearsExperience: 6,
        planType: 'standard',
        familySize: 3
    };

    // Calculate payroll components
    const grossPay = hrlib.calculate_gross_pay(employee.hoursWorked, employee.hourlyRate);
    const ptoAccrued = hrlib.calculate_pto_accrual(employee.hoursWorked);
    const match401k = hrlib.calculate_401k_match(grossPay, employee.employeeContrib);
    const payGrade = hrlib.determine_pay_grade(employee.yearsExperience, employee.performanceRating);
    const healthPremium = hrlib.calculate_health_premium(employee.planType, employee.familySize);

    const regularHours = Math.min(employee.hoursWorked, 40);
    const overtimeHours = Math.max(employee.hoursWorked - 40, 0);
    const netPay = grossPay - employee.employeeContrib - healthPremium - hrlib.calculate_tax(grossPay, 0.22);

    console.log(`⏰ Hours: ${regularHours} regular + ${overtimeHours} overtime = ${employee.hoursWorked} total`);
    console.log(`💵 Gross pay: ${hrlib.format_currency(grossPay)} (includes ${hrlib.format_currency(overtimeHours * employee.hourlyRate * 0.5)} overtime)`);
    console.log(`🏖️  PTO accrued: ${ptoAccrued.toFixed(2)} hours this pay period`);
    console.log(`💼 401k employee: ${hrlib.format_currency(employee.employeeContrib)} | company match: ${hrlib.format_currency(match401k)}`);
    console.log(`📈 Pay grade: ${payGrade}/10 (based on experience + performance)`);
    console.log(`🏥 Health premium: ${hrlib.format_currency(healthPremium)}/month (employee portion)`);
    console.log(`💸 **Net pay: ${hrlib.format_currency(netPay)}**`);

    // =============================================================================
    // FINANCE SCENARIO
    // =============================================================================

    console.log('\n💰 FINANCE SCENARIO: Investment & Loan Analysis');
    console.log('-'.repeat(50));

    // Get the full binding object which includes both standard library and extensions
    const finlib = financeDSL.getStandardLibrary();

    // Financial scenarios
    const mortgage = {
        principal: 250000,
        annualRate: 0.045,
        years: 30
    };

    const investment = {
        cashFlows: [-100000, 30000, 35000, 40000, 45000],
        discountRate: 0.08,
        presentValue: 10000,
        rate: 0.07,
        periods: 10
    };

    // Calculate financial metrics
    const monthlyPayment = finlib.calculate_monthly_payment(mortgage.principal, mortgage.annualRate, mortgage.years);
    const totalPaid = monthlyPayment * mortgage.years * 12;
    const totalInterest = totalPaid - mortgage.principal;

    const npv = finlib.calculate_npv(investment.cashFlows, investment.discountRate);
    const roi = finlib.calculate_roi(investment.cashFlows.slice(1).reduce((a, b) => a + b, 0), Math.abs(investment.cashFlows[0]));
    const futureValue = finlib.future_value(investment.presentValue, investment.rate, investment.periods);

    console.log(`🏠 Mortgage: ${finlib.format_currency(mortgage.principal)} at ${(mortgage.annualRate * 100).toFixed(1)}% for ${mortgage.years} years`);
    console.log(`💳 Monthly payment: ${finlib.format_currency(monthlyPayment)}`);
    console.log(`📊 Total paid: ${finlib.format_currency(totalPaid)} (${finlib.format_currency(totalInterest)} in interest)`);
    console.log(`📈 Investment NPV: ${finlib.format_currency(npv)} (${npv > 0 ? '✅ Profitable' : '❌ Not viable'})`);
    console.log(`💹 Investment ROI: ${roi.toFixed(1)}%`);
    console.log(`🎯 Future value: ${finlib.format_currency(investment.presentValue)} → ${finlib.format_currency(futureValue)} in ${investment.periods} years`);

    // Sample amortization schedule (first 3 payments)
    console.log(`\n📋 Sample Amortization (First 3 Payments):`);
    const schedule = finlib.amortization_schedule(mortgage.principal, mortgage.annualRate, 36);
    schedule.slice(0, 3).forEach(payment => {
        console.log(`   Month ${payment.month}: Payment ${finlib.format_currency(payment.payment)} | Principal ${finlib.format_currency(payment.principal)} | Interest ${finlib.format_currency(payment.interest)} | Balance ${finlib.format_currency(payment.balance)}`);
    });

    // =============================================================================
    // EXTENSION SYSTEM SUMMARY
    // =============================================================================

    console.log('\n🔧 EXTENSION SYSTEM SUMMARY');
    console.log('-'.repeat(50));

    const ecommerceAPI = ecommerceDSL.getAPI();
    const hrAPI = hrDSL.getAPI();
    const financeAPI = financeDSL.getAPI();

    console.log('📊 Domain Function Counts:');
    console.log(`   🛒 E-commerce: ${ecommerceAPI.extensions.functions.length} custom functions`);
    console.log(`   👥 HR/Payroll: ${hrAPI.extensions.functions.length} custom functions`);
    console.log(`   💰 Finance: ${financeAPI.extensions.functions.length} custom functions`);

    console.log('\n🎯 Total Functions Available:');
    console.log(`   📚 Standard Library: ${ecommerceAPI.standardLibrary.length} functions (same for all)`);
    console.log(`   🔧 Domain Extensions: ${ecommerceAPI.extensions.functions.length + hrAPI.extensions.functions.length + financeAPI.extensions.functions.length} functions across all domains`);

    console.log('\n💡 Key Benefits Demonstrated:');
    console.log('   ✅ Same foundational language, different domain vocabularies');
    console.log('   ✅ Natural business syntax that domain experts can understand');
    console.log('   ✅ Comprehensive standard library for common operations');
    console.log('   ✅ Easy extension system for domain-specific functionality');
    console.log('   ✅ Production-ready with enterprise lexiparse features');

    return {
        domains: ['ecommerce', 'hr', 'finance'],
        totalExtensions: ecommerceAPI.extensions.functions.length + hrAPI.extensions.functions.length + financeAPI.extensions.functions.length,
        standardLibrarySize: ecommerceAPI.standardLibrary.length
    };
}

// Run demonstration if called directly
if (require.main === module) {
    const result = demonstrateDomainExtensions();

    console.log('\n' + '='.repeat(70));
    console.log('🎉 DOMAIN EXTENSION DEMONSTRATION COMPLETE');
    console.log('='.repeat(70));
    console.log(`🎯 Demonstrated ${result.domains.length} business domains with CoreDS extensions`);
    console.log(`📚 Total: ${result.standardLibrarySize} standard functions + ${result.totalExtensions} domain functions`);
    console.log('\n📖 For complete tutorial and documentation:');
    console.log('   👉 Read examples/CoreDS_Tutorial.md');
    console.log('   👉 Run node examples/coreds.js for CoreDS foundation demo');
    console.log('\n🚀 Ready to build your own domain-specific language with CoreDS!');
}

module.exports = { ecommerceModule, hrModule, financeModule, demonstrateDomainExtensions };