/* All 40 calculators. Each: fields (defaults) + run(values) -> { stats, chart, table } or { err }.
   Formulas follow the original site's calculators; defaults reproduce the original worked examples. */
(function () {
  'use strict';
  var D = window.BPW_CALCS = {};
  function reg(name, spec) { spec.name = name; D[name] = spec; }

  /* ---- format helpers ---- */
  function commas(n, d) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function money(n) { var r = Math.round(n); return (r < 0 ? '-$' : '$') + commas(Math.abs(r)); }
  function money2(n) { return (n < 0 ? '-$' : '$') + commas(Math.abs(n), 2); }
  function pct(n, d) { return Number(n).toFixed(d == null ? 2 : d) + '%'; }
  function ym(m) { var y = Math.floor(m / 12), r = m % 12; return (y ? y + 'y ' : '') + r + 'mo'; }
  function months(m) { var y = Math.floor(m / 12), r = m % 12; if (!y) return r + (r === 1 ? ' month' : ' months'); if (!r) return y + (y === 1 ? ' year' : ' years'); return y + (y === 1 ? ' year ' : ' years ') + r + (r === 1 ? ' month' : ' months'); }
  function F(k, l, v, t, x) { var f = { k: k, l: l, v: v, t: t || 'num' }; if (x) for (var i in x) f[i] = x[i]; return f; }
  var TAX = [['10', '10%'], ['12', '12%'], ['22', '22%'], ['24', '24%'], ['32', '32%'], ['35', '35%'], ['37', '37%']];

  /* ---- math helpers ---- */
  function fvA(pv, pmt, r, n) { return r === 0 ? pv + pmt * n : pv * Math.pow(1 + r, n) + pmt * ((Math.pow(1 + r, n) - 1) / r); }
  function loanPmt(P, annualPct, years) { var r = annualPct / 100 / 12, n = years * 12; if (n <= 0) return 0; return r === 0 ? P / n : P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1); }
  function annualPmt(P, ratePct, years) { var r = ratePct / 100; if (years <= 0) return 0; return r === 0 ? P / years : P * (r * Math.pow(1 + r, years)) / (Math.pow(1 + r, years) - 1); }
  function nper(B, aprPct, pay) { var r = aprPct / 1200; if (pay <= B * r) return null; var n = r === 0 ? B / pay : -Math.log(1 - B * r / pay) / Math.log(1 + r); return isFinite(n) && n <= 600 ? n : null; }
  function schedule(P, annualPct, pay) { // month-by-month payoff
    var r = annualPct / 100 / 12, b = P, ti = 0, m = 0;
    while (b > 0 && m < 600) { var i = b * r; ti += i; var p = pay > b + i ? b + i : pay; b = b + i - p; if (b < 0.01) b = 0; m++; }
    return { months: m, interest: ti };
  }
  function yearly(pv, pmt, r, n, begin) { var b = pv, s = [pv]; for (var y = 1; y <= n; y++) { b = begin ? (b + pmt) * (1 + r) : b * (1 + r) + pmt; s.push(b); } return s; }

  /* ================= RETIREMENT ================= */
  reg('The Power of 401k Catch-Ups', {
    fields: [F('bal', 'Expected 401(k) balance at age 60', 250000, 'cur'), F('rate', 'Expected annual interest rate', 6, 'pct')],
    run: function (v) {
      var L = 24500, CU = 8000, SC = 11250, r = v.rate / 100;
      function path(n1, c1, c2) { var b = v.bal, a = [b]; for (var y = 1; y <= 7; y++) { b = b * (1 + r) + (y <= n1 ? c1 : c2); a.push(b); } return a; }
      var a = path(0, L, L), b = path(0, L + CU, L + CU), c = path(4, L + SC, L + CU), benefit = c[7] - a[7], mr = r / 12;
      var inc = benefit > 0 ? (mr > 0 ? benefit * mr / (1 - Math.pow(1 + mr, -360)) : benefit / 360) : 0;
      return {
        stats: [['#', 'Projected balance at age 67'], ['Regular contributions only ($24,500/year)', money(a[7])], ['With 50+ catch-up ($32,500/year)', money(b[7])], ['With super catch-up, ages 60-63 ($35,750/year, then $32,500/year)', money(c[7]), 1],
          ['Additional monthly retirement income (over 30 years)', money2(inc)]],
        chart: { series: [{ n: 'Regular', d: a }, { n: '50+ catch-up', d: b }, { n: 'Super catch-up', d: c }], x: ['Age 60', 'Age 67'] }
      };
    }
  });

  reg('My Retirement Savings', {
    fields: [F('age', 'Current age', 30, 'int'), F('ret', 'Retirement age', 67, 'int'), F('bal', 'Current retirement savings', 300000, 'cur'), F('add', 'Annual contribution', 5000, 'cur'), F('rate', 'Annual rate of return', 7, 'pct')],
    run: function (v) {
      if (v.ret <= v.age) return { err: 'Retirement age must be later than your current age.' };
      var n = Math.round(v.ret - v.age), s = yearly(v.bal, v.add, v.rate / 100, n, true);
      return { stats: [['Years to retirement', String(n)], ['Projected retirement savings', money(s[n]), 1]], chart: { series: [{ n: 'Projected savings', d: s }], x: ['Age ' + v.age, 'Age ' + v.ret] } };
    }
  });

  reg('Annuity Comparison', {
    fields: [F('i1', 'Initial investment', 100000, 'cur', { s: 'Option 1' }), F('r1', 'Annual rate of return', 5, 'pct'), F('t1', 'Type of annuity', 'imm', 'sel', { o: [['imm', 'Immediate annuity'], ['def', 'Deferred annuity']] }), F('g1', 'Number of years to grow (deferred only)', 0, 'int'), F('p1', 'Payout period', 20, 'int', { u: 'years' }),
      F('i2', 'Initial investment', 100000, 'cur', { s: 'Option 2' }), F('r2', 'Annual rate of return', 6, 'pct'), F('t2', 'Type of annuity', 'imm', 'sel', { o: [['imm', 'Immediate annuity'], ['def', 'Deferred annuity']] }), F('g2', 'Number of years to grow (deferred only)', 5, 'int'), F('p2', 'Payout period', 20, 'int', { u: 'years' })],
    run: function (v) {
      function opt(i, rp, t, g, p) { var r = rp / 100, val = t === 'imm' ? i : i * Math.pow(1 + r, g), pay = r === 0 ? val / p : val * (r * Math.pow(1 + r, p)) / (Math.pow(1 + r, p) - 1); return { val: val, pay: pay, tot: pay * p }; }
      var a = opt(v.i1, v.r1, v.t1, v.g1, v.p1), b = opt(v.i2, v.r2, v.t2, v.g2, v.p2);
      return { stats: [['#', 'Option 1'], ['Value of annuity at time of payout', money(a.val)], ['Projected annual payout', money(a.pay), 1], ['Total payout', money(a.tot)], ['#', 'Option 2'], ['Value of annuity at time of payout', money(b.val)], ['Projected annual payout', money(b.pay), 1], ['Total payout', money(b.tot)]] };
    }
  });

  reg('Simple 401k', {
    fields: [F('sal', 'Pre-tax salary', 100000, 'cur'), F('bal', 'Current retirement savings', 100000, 'cur'), F('cr', 'Contribution rate', 6, 'pct'), F('em', 'Employer match', 3, 'pct'), F('rate', 'Expected annual rate of return', 8, 'pct'), F('n', 'Years to retirement', 10, 'int', { u: 'years' })],
    run: function (v) {
      var own = v.sal * v.cr / 100, match = v.sal * v.em / 100, tot = own + match, r = v.rate / 100, n = Math.round(v.n);
      var end = fvA(v.bal, tot, r, n), put = tot * n;
      return { stats: [['#', 'Projected retirement savings'], ['Estimated total at retirement', money(end), 1], ['#', 'Contribution breakdown'], ['Your annual contribution', money(own)], ['Employer match contribution', money(match)], ['Total annual contribution', money(tot)], ['Total contributions over time', money(put)], ['Total investment earnings', money(end - v.bal - put)]],
        chart: { series: [{ n: '401(k) growth projection', d: yearly(v.bal, tot, r, n) }] } };
    }
  });

  reg('Inflation & Retirement', {
    fields: [F('n', 'Years until retirement', 25, 'int', { u: 'years' }), F('bal', 'Current retirement savings', 200000, 'cur'), F('add', 'Annual retirement contributions', 10000, 'cur'), F('exp', 'Current annual expenses', 50000, 'cur'), F('infl', 'Expected annual inflation rate', 3, 'pct'), F('pre', 'Expected pre-retirement annual return', 7, 'pct'), F('post', 'Expected post-retirement annual return', 5, 'pct')],
    run: function (v) {
      var adj = v.exp * Math.pow(1 + v.infl / 100, v.n), r = v.pre / 100, sav = r === 0 ? v.bal + v.add * v.n : v.bal * Math.pow(1 + r, v.n) + v.add * (Math.pow(1 + r, v.n) - 1) / r;
      var i = v.infl / 100, rr = (1 + v.post / 100) / (1 + i) - 1, last = 0;
      if (adj > 0 && sav > 0 && !(adj >= sav * (1 + rr))) { if (Math.abs(rr) < 1e-10) last = sav / adj; else { var ratio = adj / (adj - sav * rr); last = ratio > 0 ? Math.log(ratio) / Math.log(1 + rr) : 0; } }
      return { stats: [['Inflation-adjusted annual expenses at retirement', money(adj), 1], ['Projected retirement savings at retirement', money(sav)], ['Projected years your savings will last (inflation-adjusted)', last.toFixed(2)]] };
    }
  });

  reg('IRA Income', {
    fields: [F('bal', 'Current IRA balance', 100000, 'cur'), F('add', 'Annual contribution', 10000, 'cur'), F('n', 'Years to retirement', 30, 'int', { u: 'years' }), F('len', 'Estimated length of retirement', 30, 'int', { u: 'years' }), F('pre', 'Expected pre-retirement annual rate of return', 8, 'pct'), F('post', 'Expected post-retirement annual rate of return', 5, 'pct')],
    run: function (v) {
      var r = v.pre / 100, p = v.post / 100;
      if (v.n <= 0 || r <= 0 || p <= 0 || v.len <= 0) return { err: 'Enter years and rates greater than zero.' };
      var fv = v.bal * Math.pow(1 + r, v.n) + v.add * ((Math.pow(1 + r, v.n) - 1) / r), inc = fv * (p * Math.pow(1 + p, v.len)) / (Math.pow(1 + p, v.len) - 1);
      return { stats: [['Future value of IRA at retirement', money(fv), 1], ['Estimated annual income', money(inc)]] };
    }
  });

  var RMD = { 72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1, 80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9, 96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4, 101: 6.0, 102: 5.6, 103: 5.2, 104: 4.9, 105: 4.6, 106: 4.3, 107: 4.1, 108: 3.9, 109: 3.7, 110: 3.5, 111: 3.4, 112: 3.3, 113: 3.1, 114: 3.0, 115: 2.9, 116: 2.8, 117: 2.7, 118: 2.5, 119: 2.3, 120: 2.0 };
  var ages = []; for (var a = 72; a <= 120; a++) ages.push([a, String(a)]);
  reg('Estimate Your RMD', {
    disc: 'This estimate uses the IRS Uniform Lifetime Table, which applies to most retirees, and assumes you are unmarried, or married with a spouse not more than 10 years younger, or your spouse is not the sole beneficiary of your account. Withdrawals are taxed as ordinary income and, if taken before age 59½, may be subject to a 10% federal income tax penalty.',
    fields: [F('bal', 'Traditional IRA/401(k) balance', 100000, 'cur'), F('age', 'Your age', 72, 'sel', { o: ages })],
    run: function (v) { var d = RMD[v.age]; return { stats: [['Required minimum distribution', money(d ? v.bal / d : 0), 1], ['IRS life expectancy factor', d ? d.toFixed(1) : '--']] }; }
  });

  reg('Roth 401(k) vs. Traditional 401(k)', {
    fields: [F('add', 'Annual contribution', 10000, 'cur'), F('n', 'Years to retirement', 30, 'int', { u: 'years' }), F('rate', 'Annual rate of return', 8, 'pct'), F('ct', 'Current tax rate', '22', 'sel', { o: TAX }), F('rt', 'Expected retirement tax rate', '22', 'sel', { o: TAX })],
    run: function (v) {
      var r = v.rate / 100, roth = fvA(0, v.add * (1 - v.ct / 100), r, v.n), trad = fvA(0, v.add, r, v.n);
      return { stats: [['Future value of Roth 401(k)', money(roth), 1], ['Future value of Traditional 401(k)', money(trad)], ['After-tax value of Traditional 401(k)', money(trad * (1 - v.rt / 100))]],
        chart: { bars: [{ n: 'Roth 401(k)', v: roth, t: money(roth), c: 0 }, { n: 'Traditional (before tax)', v: trad, t: money(trad), c: 2 }, { n: 'Traditional (after tax)', v: trad * (1 - v.rt / 100), t: money(trad * (1 - v.rt / 100)), c: 1 }] } };
    }
  });

  reg('Emergency Fund Calculator', {
    fields: [F('a', 'Rent/mortgage', 1500, 'cur'), F('b', 'Groceries', 600, 'cur'), F('c', 'Debt payments', 400, 'cur'), F('d', 'Insurance payments', 300, 'cur'), F('e', 'Utility payments', 200, 'cur'), F('f', 'Transportation costs', 350, 'cur'), F('g', 'Other expenses', 250, 'cur')],
    run: function (v) {
      var names = ['Rent/mortgage', 'Groceries', 'Debt payments', 'Insurance payments', 'Utility payments', 'Transportation costs', 'Other expenses'], keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g'], tot = 0;
      keys.forEach(function (k) { tot += v[k]; });
      return { stats: [['6-month emergency fund', money(tot * 6), 1], ['Total monthly expenses', money(tot)]], chart: { bars: keys.map(function (k, i) { return { n: names[i], v: v[k], t: money(v[k]), c: i % 4 }; }) } };
    }
  });

  reg('What Rate Would I Need to Earn on My Savings?', {
    fields: [F('goal', 'Savings goal', 1000000, 'cur'), F('bal', 'Initial balance', 50000, 'cur'), F('add', 'Annual deposit amount', 10000, 'cur'), F('n', 'Years to grow', 30, 'int', { u: 'years' })],
    run: function (v) {
      var put = v.bal + v.add * v.n, f = function (r) { return fvA(v.bal, v.add, r, v.n); };
      if (v.n <= 0 || v.goal <= 0) return { err: 'Enter a savings goal and the years to grow.' };
      if (f(0) >= v.goal) return { stats: [['Annual rate needed', '0.00%', 1], ['Total contributions', money(put)], ['Growth needed', money(Math.max(0, v.goal - put))]] };
      if (f(1) < v.goal) return { err: 'With these inputs the goal may not be reachable. Try increasing your years to grow or deposit amount.' };
      var lo = 0, hi = 1, mid; for (var i = 0; i < 100; i++) { mid = (lo + hi) / 2; if (f(mid) < v.goal) lo = mid; else hi = mid; }
      return { stats: [['Annual rate needed', pct(mid * 100), 1], ['Total contributions', money(put)], ['Growth needed', money(v.goal - put)]] };
    }
  });

  reg('How Much Do I Need To Retire?', {
    fields: [F('inc', 'My annual income', 100000, 'cur'), F('exp', 'Expected annual expenses in retirement', 30000, 'cur'), F('len', 'Retirement length', 30, 'int', { u: 'years' }), F('rate', 'Expected annual rate of return', 5, 'pct'), F('ss', 'Social Security income replacement', 40, 'pct')],
    run: function (v) {
      var r = v.rate / 100, pvf = r === 0 ? v.len : (1 - Math.pow(1 + r, -v.len)) / r, k = 1 - v.ss / 100;
      var e = v.inc * 0.8 * pvf, t = v.inc * 10, x = v.exp * 25, avg = (e + t + x) / 3;
      return { stats: [['Average of the three rules', money(avg), 1], ['#', '80% rule'], ['Without Social Security', money(e)], ['With Social Security', money(e * k)], ['#', '10x salary rule'], ['Without Social Security', money(t)], ['With Social Security', money(t * k)], ['#', '25x expenses rule'], ['Without Social Security', money(x)], ['With Social Security', money(x * k)]],
        chart: { bars: [{ n: '80% rule', v: e, t: money(e), c: 0 }, { n: '10x salary', v: t, t: money(t), c: 1 }, { n: '25x expenses', v: x, t: money(x), c: 2 }, { n: 'Average', v: avg, t: money(avg), c: 3 }] } };
    }
  });

  /* ================= ESTATE / INVESTMENT ================= */
  reg('Comparing Mortgage Terms', {
    fields: [F('p', 'Loan amount', 300000, 'cur'), F('r1', 'First loan annual interest rate', 6, 'pct', { s: 'First loan' }), F('t1', 'First loan term', 15, 'int', { u: 'years' }), F('r2', 'Second loan annual interest rate', 7, 'pct', { s: 'Second loan' }), F('t2', 'Second loan term', 30, 'int', { u: 'years' })],
    run: function (v) {
      function m(r, t) { var pm = loanPmt(v.p, r, t), tot = pm * t * 12; return { pm: Math.round(pm), ti: Math.round(tot - v.p), tp: Math.round(tot) }; }
      var a = m(v.r1, v.t1), b = m(v.r2, v.t2);
      return { stats: [['#', 'First loan'], ['Monthly payment', money(a.pm), 1], ['Total interest paid', money(a.ti)], ['Total amount paid', money(a.tp)], ['#', 'Second loan'], ['Monthly payment', money(b.pm), 1], ['Total interest paid', money(b.ti)], ['Total amount paid', money(b.tp)]],
        chart: { bars: [{ n: 'Total interest, first loan', v: a.ti, t: money(a.ti), c: 0 }, { n: 'Total interest, second loan', v: b.ti, t: money(b.ti), c: 1 }] } };
    }
  });

  reg('How Long Will Your Money Last?', {
    fields: [F('bal', 'Initial portfolio balance', 2000000, 'cur'), F('wd', 'Annual withdrawal amount', 65000, 'cur'), F('rate', 'Annual rate of return', 5, 'pct'), F('infl', 'Inflation rate', 2, 'pct')],
    run: function (v) {
      var b = v.bal, rows = [], dep = null, s = [b];
      for (var y = 1; y <= 30; y++) {
        var w = v.wd * Math.pow(1 + v.infl / 100, y - 1), after = b - w, earn = after * v.rate / 100, end = after + earn;
        rows.push(['' + y, money(b), money(w), money(earn), money(end)]); s.push(Math.max(0, end));
        if (end <= 0 && dep === null) dep = y; b = end; if (end <= 0) break;
      }
      return { stats: [[dep ? 'Savings depleted by year' : 'Savings will last', dep ? String(dep) : '30+ years', 1], ['p', dep ? 'Based on your current withdrawal rate, your savings will be depleted by year ' + dep + '.' : 'Based on your current withdrawal rates, your savings will last you at least 30 years into retirement.']],
        chart: { series: [{ n: 'Balance', d: s }], x: ['Year 0', 'Year ' + (s.length - 1)] }, table: { title: 'Year-by-year breakdown', cols: ['Year', 'Starting balance', 'Withdrawal', 'Earnings', 'Ending balance'], rows: rows } };
    }
  });

  reg('Monthly Budget', {
    fields: [F('pay', 'Monthly take-home pay', 5000, 'cur', { s: 'Income' }), F('oth', 'Other monthly income (side projects, etc.)', 500, 'cur'), F('h', 'Housing (rent/mortgage)', 1500, 'cur', { s: 'Expenses' }), F('u', 'Utilities', 200, 'cur'), F('f', 'Food & groceries', 600, 'cur'), F('t', 'Transportation', 300, 'cur'), F('d', 'Debt payments (credit cards, student loans, etc.)', 350, 'cur'), F('x', 'Discretionary spending (dining, entertainment, non-essentials)', 500, 'cur'), F('o', 'Other expenses (insurance, childcare, medical)', 100, 'cur')],
    run: function (v) {
      var inc = v.pay + v.oth, keys = [['h', 'Housing'], ['u', 'Utilities'], ['f', 'Food & groceries'], ['t', 'Transportation'], ['d', 'Debt payments'], ['x', 'Discretionary'], ['o', 'Other']], exp = 0;
      keys.forEach(function (k) { exp += v[k[0]]; });
      return { stats: [['Monthly cash flow', money(inc - exp), 1], ['Total income', money(inc)], ['Total expenses', money(exp)]], chart: { bars: keys.map(function (k, i) { return { n: k[1], v: v[k[0]], t: money(v[k[0]]) + (exp ? ' (' + (v[k[0]] / exp * 100).toFixed(0) + '%)' : ''), c: i % 4 }; }) } };
    }
  });

  reg('College Savings', {
    fields: [F('bal', 'Current college savings', 5000, 'cur'), F('n', 'Years until college', 15, 'int', { u: 'years' }), F('add', 'Annual contribution', 2400, 'cur'), F('rate', 'Expected annual rate of return', 7, 'pct'), F('cost', 'Current annual college cost', 25000, 'cur'), F('infl', 'Projected college inflation rate', 5, 'pct')],
    run: function (v) {
      var r = v.rate / 100, saved = fvA(v.bal, v.add, r, v.n), cost = 0, i = v.infl / 100;
      for (var y = 0; y < 4; y++) cost += v.cost * Math.pow(1 + i, v.n + y);
      var gap = cost - saved;
      return { stats: [['Total savings at college start', money(saved), 1], ['Future cost of four years of college', money(cost)], [gap > 0 ? 'Savings gap' : 'Savings surplus', money(Math.abs(gap))]], chart: { series: [{ n: 'Savings over time', d: yearly(v.bal, v.add, r, v.n) }] } };
    }
  });

  reg('Comparing Investments', {
    fields: [F('ia', 'Initial investment', 100000, 'cur', { s: 'Investment A' }), F('ca', 'Annual contribution', 12000, 'cur'), F('ra', 'Expected annual rate of return', 9, 'pct'), F('ib', 'Initial investment', 200000, 'cur', { s: 'Investment B' }), F('cb', 'Annual contribution', 5000, 'cur'), F('rb', 'Expected annual rate of return', 5, 'pct'), F('n', 'Years to grow', 20, 'int', { u: 'years', s: 'Time horizon' })],
    run: function (v) {
      var a = fvA(v.ia, v.ca, v.ra / 100, v.n), b = fvA(v.ib, v.cb, v.rb / 100, v.n);
      return { stats: [['#', 'Projected values after ' + v.n + ' years'], ['Investment option A', money(a), 1], ['Investment option B', money(b), 1], ['Difference', money(Math.abs(Math.round(a) - Math.round(b)))]], chart: { series: [{ n: 'Option A', d: yearly(v.ia, v.ca, v.ra / 100, v.n) }, { n: 'Option B', d: yearly(v.ib, v.cb, v.rb / 100, v.n) }] } };
    }
  });

  reg('Debt vs. Investment', {
    fields: [F('debt', 'Total debt balance', 10000, 'cur'), F('dr', 'Debt annual interest rate', 8, 'pct'), F('ir', 'Investment annual rate of return', 6, 'pct'), F('pay', 'Monthly budget (to be applied to debt or investing)', 400, 'cur')],
    run: function (v) {
      var md = v.dr / 100 / 12, mi = v.ir / 100 / 12, rem = v.debt, ti = 0, m = 0, first = v.debt * md, covers = v.pay > first, precise = 0;
      if (!covers) { m = 360; precise = 360; ti = v.pay * 360; }
      else {
        var prev = 0;
        while (rem > 0.01 && m < 600) { prev = rem; var ic = rem * md; ti += ic; var pp = v.pay - ic; if (pp <= 0) { m = 600; break; } rem -= pp; m++; }
        precise = m;
        if (m > 0 && m < 600 && prev > 0) { var owed = prev + prev * md; if (owed < v.pay) precise = m - 1 + owed / v.pay; }
      }
      var n = Math.min(precise, 360), inv = mi === 0 ? v.pay * n : v.pay * ((Math.pow(1 + mi, n) - 1) / mi);
      if (inv > 1e8) inv = 1e8;
      var put = v.pay * n, gain = inv - put; if (gain < 0) gain = inv * 0.9;
      var net = gain - ti, rec = net > 0 ? 'Invest' : 'Pay off debt';
      var note = net > 0 ? 'If the results favor investing, make sure your expected annual investment return is realistic. It is often wise to eliminate high-interest debt first while maintaining consistent contributions to tax-advantaged retirement accounts.' : 'If your answer suggests paying off debt, you might consider adjusting some of your inputs to see if that changes your thinking.';
      return { stats: [['Recommendation', rec, 1], ['Interest paid on debt', money(Math.max(0, ti))], ['Investment earnings over the same period', money(gain)], ['#', 'Analysis details'], ['Time to pay off debt', covers ? Math.round(precise) + ' months' : 'Payment does not cover interest'], ['Future value of investment', money(inv)], ['p', note]],
        chart: { bars: [{ n: 'Interest on debt', v: Math.max(0, ti), t: money(Math.max(0, ti)), c: 1 }, { n: 'Investment earnings', v: Math.max(0, gain), t: money(Math.max(0, gain)), c: 0 }] } };
    }
  });

  reg('What Is My Net Worth?', {
    fields: [F('a1', 'Cash', 10000, 'cur', { s: 'Assets' }), F('a2', 'Investments', 50000, 'cur'), F('a3', 'Real estate', 300000, 'cur'), F('a4', 'Vehicles', 25000, 'cur'), F('a5', 'Other valuables', 5000, 'cur'), F('l1', 'Mortgage', 200000, 'cur', { s: 'Liabilities' }), F('l2', 'Student loans', 25000, 'cur'), F('l3', 'Credit card debt', 5000, 'cur'), F('l4', 'Car loans', 15000, 'cur'), F('l5', 'Other debt', 500, 'cur')],
    run: function (v) {
      var a = v.a1 + v.a2 + v.a3 + v.a4 + v.a5, l = v.l1 + v.l2 + v.l3 + v.l4 + v.l5;
      return { stats: [['Total net worth', money(a - l), 1], ['Total assets', money(a)], ['Total liabilities', money(l)]], chart: { bars: [{ n: 'Total assets', v: a, t: money(a), c: 0 }, { n: 'Total liabilities', v: l, t: money(l), c: 1 }] } };
    }
  });

  reg('Student Loan Payoff Calculator: Extra Payments Can Save You Money', {
    title: 'Student Loan Payoff Calculator',
    fields: [F('bal', 'Current loan balance', 100000, 'cur'), F('rate', 'Interest rate', 6, 'pct'), F('pay', 'Current monthly payment', 1000, 'cur'), F('extra', 'Extra monthly payment', 250, 'cur')],
    run: function (v) {
      if (v.bal <= 0 || v.pay <= v.bal * v.rate / 1200) return { err: 'Your monthly payment must be greater than the monthly interest on the loan.' };
      var a = schedule(v.bal, v.rate, v.pay), b = schedule(v.bal, v.rate, v.pay + v.extra);
      return { stats: [['Interest saved with extra monthly payments', money(a.interest - b.interest), 1], ['Time saved with extra monthly payments', months(a.months - b.months)], ['#', 'Regular payments'], ['Time to pay off', ym(a.months)], ['Total interest', money(a.interest)], ['Total paid', money(v.bal + a.interest)], ['#', 'With extra payments'], ['Time to pay off', ym(b.months)], ['Total interest', money(b.interest)], ['Total paid', money(v.bal + b.interest)],
        ['p', 'By making extra payments of ' + money(v.extra) + ' per month, you could pay off your loan ' + (a.months - b.months) + ' months sooner and save ' + money(a.interest - b.interest) + ' in interest over the course of the loan.']],
        chart: { bars: [{ n: 'Interest, regular payments', v: a.interest, t: money(a.interest), c: 1 }, { n: 'Interest, with extra payments', v: b.interest, t: money(b.interest), c: 0 }] } };
    }
  });

  reg('Student Loan Refinance Calculator', {
    fields: [F('bal', 'Remaining balance', 100000, 'cur'), F('pay', 'Current monthly payment', 1000, 'cur'), F('cr', 'Current interest rate', 6, 'pct'), F('nt', 'New loan term', 139, 'int', { u: 'months' }), F('nr', 'New interest rate', 4, 'pct'), F('fee', 'Refinance cost', 4, 'pct', { u: '' })],
    run: function (v) {
      var r = v.cr / 1200, n0 = nper(v.bal, v.cr, v.pay);
      if (n0 === null) return { err: 'Your current payment must be greater than the monthly interest on the loan.' };
      var months0 = Math.round(n0), curInt = v.pay * months0 - v.bal, fee = v.bal * v.fee / 100, P = v.bal + fee, mr = v.nr / 1200;
      var pm = mr === 0 ? P / v.nt : P * mr / (1 - Math.pow(1 + mr, -v.nt)), tot = pm * v.nt, newInt = tot - v.bal;
      return { stats: [['#', 'Current loan'], ['Monthly payment', money(v.pay)], ['Total interest', money(curInt)], ['Total cost', money(v.bal + curInt)], ['#', 'Refinanced loan'], ['Monthly payment', money(pm)], ['Total interest', money(newInt)], ['Total cost', money(v.bal + newInt)], ['Refinance cost (added to the loan)', money(fee)],
        ['By refinancing at ' + pct(v.nr) + ' instead of ' + pct(v.cr) + ', you could save', money(curInt - newInt), 1]],
        chart: { bars: [{ n: 'Total interest, current loan', v: curInt, t: money(curInt), c: 1 }, { n: 'Total interest, refinanced', v: Math.max(0, newInt), t: money(newInt), c: 0 }] } };
    }
  });

  reg('Wedding Budget Calculator', {
    fields: [F('total', 'Total budget', 50000, 'cur'), F('venue', 'Venue', 5000, 'cur', { s: 'Expenses' }), F('cater', 'Catering', 1300, 'cur'), F('photo', 'Photographer', 1500, 'cur'), F('video', 'Videographer', 1500, 'cur'), F('flor', 'Florist', 900, 'cur'), F('music', 'Music/DJ', 500, 'cur'), F('attire', 'Attire', 4000, 'cur'), F('plan', 'Wedding planner', 3000, 'cur'), F('cake', 'Wedding cake', 800, 'cur'), F('inv', 'Invitations', 300, 'cur'), F('reh', 'Rehearsal dinner', 2000, 'cur'), F('trans', 'Transportation', 300, 'cur'), F('hair', 'Hair & makeup', 200, 'cur'), F('fav', 'Favors', 500, 'cur'), F('bar', 'Bartender', 0, 'cur'), F('oth', 'Other expenses', 1500, 'cur')],
    run: function (v) {
      var keys = [['venue', 'Venue'], ['cater', 'Catering'], ['photo', 'Photographer'], ['video', 'Videographer'], ['flor', 'Florist'], ['music', 'Music/DJ'], ['attire', 'Attire'], ['plan', 'Wedding planner'], ['cake', 'Wedding cake'], ['inv', 'Invitations'], ['reh', 'Rehearsal dinner'], ['trans', 'Transportation'], ['hair', 'Hair & makeup'], ['fav', 'Favors'], ['bar', 'Bartender'], ['oth', 'Other expenses']], tot = 0;
      keys.forEach(function (k) { tot += v[k[0]]; });
      var list = keys.filter(function (k) { return v[k[0]] > 0; }).sort(function (a, b) { return v[b[0]] - v[a[0]]; });
      return { stats: [[v.total - tot >= 0 ? 'Remaining budget' : 'Over budget by', money(Math.abs(v.total - tot)), 1], ['Your total estimated wedding cost is', money(tot)], ['Out of your budget of', money(v.total)]],
        chart: { bars: list.map(function (k, i) { return { n: k[1], v: v[k[0]], t: money(v[k[0]]) + ' (' + (tot ? v[k[0]] / tot * 100 : 0).toFixed(1) + '%)', c: i % 4 }; }) } };
    }
  });

  reg('Bi-Weekly Mortgage Payments', {
    fields: [F('p', 'Loan amount', 200000, 'cur'), F('rate', 'Annual interest rate', 6, 'pct'), F('t', 'Loan term', 30, 'int', { u: 'years' })],
    run: function (v) {
      var pm = loanPmt(v.p, v.rate, v.t), tot = pm * v.t * 12, mi = tot - v.p, bw = pm / 2, r = v.rate / 100 / 26, b = v.p, ti = 0, paid = 0, n = 0;
      while (b > 0.01 && n < 26000) { n++; var i = b * r, p = Math.min(bw, b + i); ti += i; paid += p; b -= p - i; }
      var mo = Math.round(n / 26 * 12);
      return { stats: [['#', 'Monthly payments'], ['Monthly payment', money2(pm)], ['Total interest paid', money(mi)], ['Total amount repaid', money(tot)], ['#', 'Bi-weekly payments'], ['Bi-weekly payment amount', money2(bw), 1], ['Total interest paid', money(ti)], ['Total amount repaid', money(paid)], ['Payoff time', months(mo)], ['Interest saved', money(mi - ti), 1],
        ['p', 'By switching to bi-weekly payments, you make 26 half-payments per year instead of 12 full monthly payments. This equals one extra monthly payment each year, helping you pay off your mortgage faster and save on interest.']],
        chart: { bars: [{ n: 'Interest, monthly', v: mi, t: money(mi), c: 1 }, { n: 'Interest, bi-weekly', v: ti, t: money(ti), c: 0 }] } };
    }
  });

  reg('Taxable vs. Tax-Deferred Savings', {
    fields: [F('tdc', 'Annual contribution', 12000, 'cur', { s: 'Tax-deferred account' }), F('tdn', 'Years to grow', 12, 'int', { u: 'years' }), F('tdr', 'Annual rate of return', 10, 'pct'), F('tdb', 'Expected tax bracket during retirement', '22', 'sel', { o: TAX }),
      F('txc', 'Annual contribution', 12000, 'cur', { s: 'Taxable account' }), F('txn', 'Years to grow', 12, 'int', { u: 'years' }), F('txr', 'Annual rate of return', 10, 'pct'), F('txb', 'Tax bracket while contributing', '24', 'sel', { o: TAX })],
    run: function (v) {
      var pre = fvA(0, v.tdc, v.tdr / 100, v.tdn), after = pre * (1 - v.tdb / 100), tx = fvA(0, v.txc * (1 - v.txb / 100), v.txr / 100, v.txn), d = after - tx;
      return { stats: [[d >= 0 ? 'Difference in after-tax value (tax-deferred ahead)' : 'Difference in after-tax value (taxable ahead)', money(Math.abs(d)), 1], ['#', 'Tax-deferred account results'], ['Future value (pre-tax)', money(pre)], ['Future value (after-tax)', money(after)], ['#', 'Taxable account results'], ['Future value (after-tax)', money(tx)]],
        chart: { bars: [{ n: 'Tax-deferred (after tax)', v: after, t: money(after), c: 0 }, { n: 'Taxable (after tax)', v: tx, t: money(tx), c: 1 }] } };
    }
  });

  reg('What Is the Dividend Yield?', {
    fields: [F('px', 'Share price', 1000, 'cur', { d: 2 }), F('q', 'Quarterly dividend per share', 30, 'cur', { d: 2 }), F('tax', 'Tax bracket', '22', 'sel', { o: TAX })],
    run: function (v) {
      if (v.px <= 0) return { err: 'Enter a share price greater than zero.' };
      var y = v.q * 4 / v.px * 100, k = 1 - v.tax / 100;
      return { stats: [['Dividend yield (annualized)', pct(y), 1], ['Quarterly dividend', money2(v.q)], ['After-tax dividend yield', pct(y * k), 1], ['After-tax quarterly dividend', money2(v.q * k)], ['Tax paid quarterly', money2(v.q * (1 - k))]] };
    }
  });

  reg('Debt-to-Income Ratio Calculator', {
    fields: [F('inc', 'Gross monthly income', 4200, 'cur'), F('h', 'Mortgage / rent payment', 1300, 'cur'), F('s', 'Student loan payment', 250, 'cur'), F('c', 'Car loan / lease payment', 250, 'cur'), F('cc', 'Credit card payment', 500, 'cur'), F('cs', 'Child support payments', 0, 'cur'), F('o', 'Other loan payments', 200, 'cur')],
    run: function (v) {
      if (v.inc <= 0) return { err: 'Enter your gross monthly income.' };
      var d = v.h + v.s + v.c + v.cc + v.cs + v.o;
      return { stats: [['DTI ratio', pct(d / v.inc * 100), 1], ['Total monthly debts', money(d)], ['Gross monthly income', money(v.inc)]] };
    }
  });

  reg('The Power of Interest - How Long Will it take My Money to Double?', {
    title: 'The Power of Interest',
    fields: [F('rate', 'Annual interest rate', 8, 'pct')],
    run: function (v) {
      var r = v.rate / 100; if (r <= 0) return { err: 'Enter an interest rate greater than zero.' };
      var freq = [['Annually', 1], ['Monthly', 12], ['Weekly', 52], ['Daily', 365]];
      function yrs(k, n) { return Math.log(k) / (n * Math.log(1 + r / n)); }
      var st = [];
      [['Double (2x)', 2], ['Triple (3x)', 3], ['10x growth', 10]].forEach(function (g, gi) {
        st.push(['#', g[0] + ' your investment']);
        freq.forEach(function (f) { st.push(['Compounded ' + f[0].toLowerCase(), yrs(g[1], f[1]).toFixed(4) + ' years', gi === 0 && f[1] === 1 ? 1 : 0]); });
      });
      var s = []; for (var y = 0; y <= 40; y++) s.push(Math.pow(1 + r, y));
      return { stats: st, chart: { series: [{ n: 'Growth of $1 (annual compounding)', d: s }], x: ['Today', 'Year 40'] } };
    }
  });

  reg('How Can I Save a Million Dollars?', {
    fields: [F('bal', 'Starting balance', 500, 'cur'), F('n', 'How long you will save', 30, 'int', { u: 'years' }), F('rate', 'Expected rate of return', 6, 'pct')],
    run: function (v) {
      var r = v.rate / 100 / 12, k = v.n * 12; if (k <= 0) return { err: 'Enter how many years you will save.' };
      var fv0 = v.bal * Math.pow(1 + r, k), gap = 1000000 - fv0, pm = r === 0 ? gap / k : gap * r / (Math.pow(1 + r, k) - 1);
      if (pm < 0) pm = 0;
      var s = [v.bal], b = v.bal; for (var y = 1; y <= v.n; y++) { for (var m = 0; m < 12; m++) b = b * (1 + r) + pm; s.push(b); }
      return { stats: [['Save each month', money(pm), 1], ['#', 'How you’ll get there'], ['Starting balance', money(v.bal)], ['Total monthly contributions', money(pm * k)], ['Total you’ll contribute', money(v.bal + pm * k)], ['Interest earned', money(1000000 - v.bal - pm * k)]], chart: { series: [{ n: 'Savings growth over time', d: s }], x: ['Today', 'Year ' + v.n] } };
    }
  });

  reg('How Compound Interest Works', {
    fields: [F('p', 'Initial investment', 10000, 'cur'), F('add', 'Annual contribution', 1000, 'cur'), F('n', 'Years to grow', 20, 'int', { u: 'years' }), F('rate', 'Annual interest rate', 6, 'pct')],
    run: function (v) {
      var r = v.rate / 100, fv = fvA(v.p, v.add, r, v.n), put = v.p + v.add * v.n, c = []; for (var y = 0; y <= v.n; y++) c.push(v.p + v.add * y);
      return { stats: [['Future value', money(fv), 1], ['Total contributions', money(put)], ['Total interest earned', money(fv - put)]], chart: { series: [{ n: 'Balance', d: yearly(v.p, v.add, r, v.n) }, { n: 'What you put in', d: c }] } };
    }
  });

  /* ================= INSURANCE ================= */
  reg('How Long Will My Savings Last If I Become Disabled?', {
    fields: [F('sal', 'Your monthly salary', 10000, 'cur'), F('rep', 'Desired income replacement from disability insurance', 80, 'pct'), F('sv', 'Current savings', 30000, 'cur')],
    run: function (v) {
      if (v.sal <= 0) return { err: 'Enter your monthly salary.' };
      var a = Math.floor(v.sv / v.sal), gap = v.sal * (1 - v.rep / 100), b = gap > 0 ? Math.floor(v.sv / gap) : Infinity;
      return { stats: [['Without disability insurance', months(a), 1], ['p', 'If you relied solely on your savings to cover 100% of your current income, your funds would last this long.'], ['With disability insurance', isFinite(b) ? months(b) : 'Indefinitely', 1], ['p', 'If an insurance policy replaced your chosen percentage of income, your savings would only be needed to cover the remaining gap, allowing them to last significantly longer.']],
        chart: { bars: [{ n: 'Without insurance', v: a, t: months(a), c: 1 }, { n: 'With insurance', v: isFinite(b) ? b : a * 4, t: isFinite(b) ? months(b) : 'Indefinitely', c: 0 }] } };
    }
  });

  reg('Assess Your Life Insurance Needs', {
    fields: [F('debt', 'Total debt', 250000, 'cur'), F('inc', 'Annual income you wish to replace', 75000, 'cur'), F('yrs', 'Years of income you wish to replace', 10, 'int', { u: 'years' }), F('fut', 'Anticipated future expenses', 100000, 'cur'), F('fin', 'Estimated final expenses', 10000, 'cur'), F('ins', 'Existing life insurance', 0, 'cur'), F('sv', 'Existing liquid savings', 20000, 'cur')],
    run: function (v) {
      var need = v.debt + v.inc * v.yrs + v.fut + v.fin, have = v.ins + v.sv, gap = need - have;
      return { stats: [['Total needs', money(need)], ['Total current resources', money(have)], [gap >= 0 ? 'Estimated coverage gap' : 'Estimated surplus', money(Math.abs(gap)), 1]], chart: { bars: [{ n: 'Total needs', v: need, t: money(need), c: 1 }, { n: 'Current resources', v: have, t: money(have), c: 0 }] } };
    }
  });

  reg('Long-Term-Care Needs', {
    fields: [F('cost', 'Current annual cost of care (in today’s dollars)', 90000, 'cur'), F('sv', 'Dedicated long-term care savings', 10000, 'cur'), F('wait', 'Years until care is needed', 10, 'int', { u: 'years' }), F('len', 'Years of care needed', 5, 'int', { u: 'years' }), F('infl', 'Expected healthcare inflation rate', 3, 'pct')],
    run: function (v) {
      var fut = v.cost * Math.pow(1 + v.infl / 100, v.wait), tot = fut * v.len, gap = v.sv - tot;
      return { stats: [['Future annual cost of care', money(fut)], ['Total projected cost of care', money(tot)], [gap < 0 ? 'Projected shortfall' : 'Projected surplus', (gap < 0 ? '-' : '') + money(Math.abs(gap)), 1]], chart: { bars: [{ n: 'Total projected cost', v: tot, t: money(tot), c: 1 }, { n: 'Dedicated savings', v: v.sv, t: money(v.sv), c: 0 }] } };
    }
  });

  /* ================= TAX ================= */
  reg('Federal Capital Gains Tax Estimator', {
    fields: [F('sale', 'Sale price', 10000, 'cur'), F('basis', 'Cost basis (original purchase price)', 5000, 'cur'), F('lt', 'Is this a long-term gain?', 'Yes', 'sel', { o: [['Yes', 'Yes (held more than one year)'], ['No', 'No (short-term)']] }), F('br', 'Federal income tax bracket (used for short-term gains)', '22', 'sel', { o: TAX }), F('ltr', 'Long-term capital gains tax bracket', '20', 'sel', { o: [['0', '0%'], ['15', '15%'], ['20', '20%']] })],
    run: function (v) {
      var gain = v.sale - v.basis, rate = v.lt === 'Yes' ? v.ltr : v.br, tax = gain > 0 ? gain * rate / 100 : 0;
      return { stats: [['Total capital ' + (gain >= 0 ? 'gain' : 'loss'), money(gain)], ['Estimated tax owed', money(tax), 1], ['Tax rate applied', rate + '%']], chart: { bars: [{ n: 'Gain after tax', v: Math.max(0, gain - tax), t: money(Math.max(0, gain - tax)), c: 0 }, { n: 'Estimated tax', v: tax, t: money(tax), c: 1 }] } };
    }
  });

  reg('Social Security Tax Estimator', {
    disc: 'These figures are estimates based on 2026 payroll tax rates and the maximum taxable earnings limit. This calculator does not include additional Medicare tax for high-income earners. Consult a tax professional for personalized advice.',
    fields: [F('sal', 'Annual salary', 150000, 'cur'), F('se', 'Self-employed?', 'No', 'sel', { o: [['No', 'No'], ['Yes', 'Yes']] })],
    run: function (v) {
      var cap = 184500, taxable = Math.min(v.sal, cap), rate = v.se === 'Yes' ? 15.3 : 7.65;
      return { stats: [['Taxable earnings (your share)', money(taxable)], ['Your estimated Social Security tax', money(taxable * rate / 100), 1], ['Rate applied', rate + '%'], ['Maximum taxable earnings (2026)', money(cap)]] };
    }
  });

  /* ================= MONEY ================= */
  reg('Credit Card Payoff', {
    fields: [F('bal', 'Current credit card balance', 2000, 'cur'), F('apr', 'Annual interest rate (APR)', 25, 'pct'), F('min', 'Minimum monthly payment', 80, 'cur'), F('extra', 'Additional monthly payment', 20, 'cur')],
    run: function (v) {
      var a = nper(v.bal, v.apr, v.min); if (a === null) return { err: 'Minimum payment is insufficient to pay off the balance in a reasonable time. Please increase your payment or lower the interest rate.' };
      var b = nper(v.bal, v.apr, v.min + v.extra); if (b === null) return { err: 'Payment is insufficient to pay off the balance in a reasonable time.' };
      var ma = Math.round(a), mb = Math.round(b), ia = Math.round(a * v.min - v.bal), ib = Math.round(b * (v.min + v.extra) - v.bal);
      return { stats: [['You could save', money(ia - ib), 1], ['and pay off your debt faster by', months(ma - mb)], ['#', 'Minimum payment only'], ['Time to pay off', months(ma)], ['Total interest paid', money(ia)], ['Total amount paid', money(v.bal + ia)], ['#', 'With extra payment'], ['Time to pay off', months(mb)], ['Total interest paid', money(ib)], ['Total amount paid', money(v.bal + ib)]],
        chart: { bars: [{ n: 'Interest, minimum only', v: ia, t: money(ia), c: 1 }, { n: 'Interest, with extra', v: ib, t: money(ib), c: 0 }] } };
    }
  });

  reg('Lifetime of Earnings', {
    fields: [F('sal', 'Current annual salary', 70000, 'cur'), F('raise', 'Annual raise rate', 3, 'pct', { step: 0.25 }), F('n', 'Years until retirement', 35, 'int', { u: 'years' })],
    run: function (v) {
      var tot = 0, s = v.sal, rows = [], pts = [], n = Math.max(1, Math.round(v.n));
      for (var y = 1; y <= n; y++) { tot += s; rows.push(['' + y, money(s), money(tot)]); pts.push(s); s *= 1 + v.raise / 100; }
      return { stats: [['Projected lifetime earnings', money(tot), 1], ['Final annual salary', money(pts[n - 1])], ['Average annual earnings', money(tot / n)]], chart: { series: [{ n: 'Annual salary', d: pts }], x: ['Year 1', 'Year ' + n] }, table: { title: 'Year-by-year breakdown', cols: ['Year', 'Annual salary', 'Total earnings'], rows: rows } };
    }
  });

  var INF = { 1914: 1, 1915: 1, 1916: 7.9, 1917: 17.4, 1918: 18, 1919: 14.6, 1920: 15.6, 1921: -10.5, 1922: -6.1, 1923: 1.8, 1924: 0, 1925: 2.3, 1926: 1.1, 1927: -1.7, 1928: -1.7, 1929: 0, 1930: -2.3, 1931: -9, 1932: -9.9, 1933: -5.1, 1934: 3.1, 1935: 2.2, 1936: 1.5, 1937: 3.6, 1938: -2.1, 1939: -1.4, 1940: 0.7, 1941: 5, 1942: 10.9, 1943: 6.1, 1944: 1.7, 1945: 2.3, 1946: 8.3, 1947: 14.4, 1948: 8.1, 1949: -1.2, 1950: 1.3, 1951: 7.9, 1952: 1.9, 1953: 0.8, 1954: 0.7, 1955: -0.4, 1956: 1.5, 1957: 3.3, 1958: 2.8, 1959: 0.7, 1960: 1.7, 1961: 1, 1962: 1, 1963: 1.3, 1964: 1.3, 1965: 1.6, 1966: 2.9, 1967: 3.1, 1968: 4.2, 1969: 5.5, 1970: 5.7, 1971: 4.4, 1972: 3.2, 1973: 6.2, 1974: 11, 1975: 9.1, 1976: 5.8, 1977: 6.5, 1978: 7.6, 1979: 11.3, 1980: 13.5, 1981: 10.3, 1982: 6.2, 1983: 3.2, 1984: 4.3, 1985: 3.6, 1986: 1.9, 1987: 3.6, 1988: 4.1, 1989: 4.8, 1990: 5.4, 1991: 4.2, 1992: 3, 1993: 3, 1994: 2.6, 1995: 2.8, 1996: 3, 1997: 2.3, 1998: 1.6, 1999: 2.2, 2000: 3.4, 2001: 2.8, 2002: 1.6, 2003: 2.3, 2004: 2.7, 2005: 3.4, 2006: 3.2, 2007: 2.8, 2008: 3.8, 2009: -0.4, 2010: 1.6, 2011: 3.2, 2012: 2.1, 2013: 1.5, 2014: 1.6, 2015: 0.1, 2016: 1.3, 2017: 2.1, 2018: 2.4, 2019: 1.8, 2020: 1.2, 2021: 4.7, 2022: 8, 2023: 4.1, 2024: 2.9, 2025: 2.7 };
  reg('Historical Inflation', {
    fields: [F('amt', 'Starting amount', 100, 'cur'), F('from', 'Beginning year (1914-2025)', 2022, 'int', { y: 1 }), F('to', 'Ending year (1914-2025)', 2024, 'int', { y: 1 })],
    run: function (v) {
      var a = Math.round(v.from), b = Math.round(v.to);
      if (!(a >= 1914 && a <= 2025) || !(b >= 1914 && b <= 2025)) return { err: 'Years must be between 1914 and 2025.' };
      if (b < a) return { err: 'Please enter an ending year later than your beginning year.' };
      var val = v.amt, s = [val]; for (var y = a + 1; y <= b; y++) { val *= 1 + INF[y] / 100; s.push(val); }
      var ch = v.amt ? (val - v.amt) / v.amt * 100 : 0;
      return { stats: [['Inflation-adjusted value', money2(val), 1], ['Total change', (ch >= 0 ? '+' : '') + ch.toFixed(2) + '%']], chart: { series: [{ n: 'Value', d: s }], x: [String(a), String(b)] } };
    }
  });

  /* ================= LIFESTYLE ================= */
  reg('How Much Home Can I Afford?', {
    fields: [F('inc', 'Gross monthly income', 10000, 'cur'), F('debt', 'Monthly debts', 1000, 'cur'), F('down', 'Available down payment', 60000, 'cur'), F('rate', 'Annual interest rate', 6, 'pct'), F('t', 'Loan term', 30, 'int', { u: 'years' })],
    run: function (v) {
      if (v.t < 5 || v.t > 40) return { err: 'Loan term must be between 5 and 40 years.' };
      var front = v.inc * 0.28, back = v.inc * 0.36, mortgage = Math.max(0, Math.min(front, back - v.debt)), r = v.rate / 1200, n = v.t * 12;
      var pv = r === 0 ? mortgage * n : mortgage * (1 - Math.pow(1 + r, -n)) / r;
      return { stats: [['You can afford a house up to', money(pv + v.down), 1], ['Max monthly housing payment (28% rule)', money(front)], ['Maximum monthly debts (36% rule)', money(back)], ['Affordable monthly mortgage payment', money(mortgage)]],
        disc: 'These figures are estimates and do not include property taxes, homeowners insurance, private mortgage insurance, HOA fees, or maintenance costs.' };
    }
  });

  function mpg(v) {
    var oldD = v.miles / v.old * v.gas, newD = v.miles / v.nw * v.gas, years = v.yrs, save = (oldD - newD) * 365 * years, pay = annualPmt(v.cost, v.rate, years), tot = pay * years;
    return { stats: [['Total gasoline savings over the course of the loan', money(save), 1], ['#', 'Cost per day'], ['Current car', money2(oldD)], ['New car', money2(newD)], ['Savings per day with new car', money2(oldD - newD)], ['#', 'Your interest paid'], ['Total interest paid on new car', money(tot - v.cost)], ['Loan annual payment', money(pay)], ['Loan total amount repaid', money(tot)]],
      chart: { bars: [{ n: 'Gasoline cost per day, current car', v: oldD, t: money2(oldD), c: 1 }, { n: 'Gasoline cost per day, new car', v: newD, t: money2(newD), c: 0 }] } };
  }
  var MPGF = [F('gas', 'Gasoline cost per gallon', 3.65, 'cur', { d: 2 }), F('miles', 'Average miles driven per day', 20, 'int'), F('old', 'Current car MPG', 20, 'int'), F('nw', 'New car MPG', 30, 'int'), F('cost', 'Cost of new car after trade-in value', 25000, 'cur'), F('yrs', 'Loan payment period', 10, 'int', { u: 'years' }), F('rate', 'Loan interest rate', 5, 'pct')];
  reg("What's Your MPG?", { fields: MPGF, run: function (v) { if (v.old <= 0 || v.nw <= 0) return { err: 'Enter the MPG for both cars.' }; return mpg(v); } });
  D['What’s Your MPG?'] = D["What's Your MPG?"];

  reg('Should I Buy or Lease an Auto?', {
    fields: [F('down', 'Down payment', 3000, 'cur', { s: 'Buying' }), F('loan', 'Car loan amount', 30000, 'cur'), F('lt', 'Loan term', 5, 'int', { u: 'years' }), F('rate', 'Interest rate', 6, 'pct'), F('ldown', 'Down payment (if applicable)', 2000, 'cur', { s: 'Leasing' }), F('lpay', 'Monthly lease payment', 400, 'cur'), F('lterm', 'Lease term', 5, 'int', { u: 'years' })],
    run: function (v) {
      var ap = annualPmt(v.loan, v.rate, v.lt), buy = v.down + ap * v.lt, lease = v.lpay * v.lterm * 12 + v.ldown, diff = Math.abs(buy - lease);
      return { stats: [[buy < lease ? 'Buying is cheaper by' : 'Leasing is cheaper by', money(diff), 1], ['#', 'Buying'], ['Down payment', money(v.down)], ['Annual payment', money(ap)], ['Total loan payments', money(ap * v.lt)], ['Total cost to buy', money(buy)], ['#', 'Leasing'], ['Down payment', money(v.ldown)], ['Monthly lease payment', money(v.lpay)], ['Total lease payments', money(v.lpay * v.lterm * 12)], ['Total cost to lease', money(lease)],
        ['p', 'Buying means you own the car at the end, while leasing means you return it.']],
        chart: { bars: [{ n: 'Total cost to buy', v: buy, t: money(buy), c: 0 }, { n: 'Total cost to lease', v: lease, t: money(lease), c: 1 }] } };
    }
  });

  reg('Rent vs Buy Calculator', {
    fields: [F('price', 'Home purchase price', 500000, 'cur', { s: 'Buying' }), F('down', 'Down payment', 50000, 'cur'), F('rate', 'Mortgage interest rate', 6, 'pct'), F('t', 'Mortgage/rent term', 30, 'int', { u: 'years' }), F('rent', 'Monthly rent payment', 2000, 'cur', { s: 'Renting' }), F('inc', 'Annual rent increase', 3, 'pct')],
    run: function (v) {
      var loan = v.price - v.down, pm = loanPmt(loan, v.rate, v.t), totB = pm * v.t * 12;
      function rentTotal(n) { var tot = 0, m = v.rent, fin = m; for (var y = 1; y <= n; y++) { tot += m * 12; fin = m; m *= 1 + v.inc / 100; } return { tot: tot, fin: fin }; }
      var rt = rentTotal(v.t), r5 = rentTotal(5), cheaper = totB < rt.tot, cb = [], cr = [], a = 0, b = 0, m = v.rent;
      for (var y = 1; y <= v.t; y++) { a += pm * 12; b += m * 12; m *= 1 + v.inc / 100; cb.push(a); cr.push(b); }
      return { stats: [[cheaper ? 'Buying costs less' : 'Renting costs less', money(Math.abs(totB - rt.tot)), 1], ['p', 'Over ' + v.t + ' years, ' + (cheaper ? 'buying' : 'renting') + ' may cost ' + money(Math.abs(totB - rt.tot)) + ' less in total payments than ' + (cheaper ? 'renting' : 'buying') + '.'],
        ['#', 'Buy a home'], ['Loan amount', money(loan)], ['Monthly payment', money(pm)], ['Total payments (' + v.t + ' years)', money(totB)], ['Total payments (5 years, including down payment)', money(pm * 60 + v.down)],
        ['#', 'Rent a home'], ['Starting monthly rent', money(v.rent)], ['Final-year monthly rent', money(rt.fin)], ['Total rent paid (' + v.t + ' years)', money(rt.tot)], ['Total rent paid (5 years)', money(r5.tot)]],
        chart: { series: [{ n: 'Buying (cumulative payments)', d: [0].concat(cb) }, { n: 'Renting (cumulative rent)', d: [0].concat(cr) }] },
        disc: 'This illustration does not take into account property tax, insurance, maintenance, or other costs, nor home resale value or the costs of resale. The mortgage interest rate and annual rent increase are hypothetical.' };
    }
  });
})();
