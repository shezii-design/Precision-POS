const fs = require('fs');
let code = fs.readFileSync('src/services/supabase.ts', 'utf-8');

// syncCustomersToSupabase
code = code.replace(/    if \(ledgerEntries\.length > 0\) \{\n      const ledgerRows = ledgerEntries\.map\(l => \(\{[\s\S]*?\}\)\);\n      const ledRes = await exactSyncRows\(client, 'customer_ledger', ledgerRows, 'id'\);\n      if \(!ledRes\.success\) return \{ success: false, customerCount: customers\.length, ledgerCount: 0, error: ledRes\.error \};\n    \}/, `    const ledgerRows = ledgerEntries.map(l => ({
      id: l.id,
      customer_id: l.customerId,
      date: l.date,
      description: l.description,
      amount: Number(l.amount) || 0,
      type: l.type,
      balance: Number(l.balance) || 0,
      reference_id: l.referenceId || null
    }));
    const ledRes = await exactSyncRows(client, 'customer_ledger', ledgerRows, 'id');
    if (!ledRes.success) return { success: false, customerCount: customers.length, ledgerCount: 0, error: ledRes.error };`);

// syncVendorsAndPurchasesToSupabase
code = code.replace(/    if \(vendors\.length > 0\) \{\n      const vendorRows = vendors\.map\(v => \(\{[\s\S]*?\}\)\);\n      const vRes = await exactSyncRows\(client, 'vendors', vendorRows, 'id'\);\n      if \(!vRes\.success\) return \{ success: false, vendorCount: 0, purchaseCount: 0, poCount: 0, error: vRes\.error \};\n    \}/, `    const vendorRows = vendors.map(v => ({
      id: v.id,
      business_name: v.businessName,
      contact_person: v.contactPerson || null,
      phone: v.phone || null,
      email: v.email || null,
      address: v.address || null,
      city: v.city || null,
      ntn: v.ntn || null,
      strn: v.strn || null,
      opening_balance: Number(v.openingBalance) || 0,
      total_purchases: Number(v.totalPurchases) || 0,
      updated_at: new Date().toISOString(),
    }));
    const vRes = await exactSyncRows(client, 'vendors', vendorRows, 'id');
    if (!vRes.success) return { success: false, vendorCount: 0, purchaseCount: 0, poCount: 0, error: vRes.error };`);

code = code.replace(/    if \(purchaseOrders\.length > 0\) \{\n      const poRows = purchaseOrders\.map\(po => \(\{[\s\S]*?\}\)\);\n      const res = await exactSyncRows\(client, 'purchase_orders', poRows, 'id'\);\n      if \(!res\.success\) return \{ success: false, vendorCount: vendors\.length, purchaseCount: 0, poCount: 0, error: res\.error \};\n    \}/, `    const poRows = purchaseOrders.map(po => ({
      id: po.id,
      order_number: po.orderNumber,
      vendor_id: po.vendorId,
      vendor_name: po.vendorName,
      order_date: po.orderDate,
      expected_delivery_date: po.expectedDeliveryDate || null,
      items: po.items,
      subtotal_base_cost: Number(po.subtotalBaseCost) || 0,
      total_landed_cost: Number(po.totalLandedCost) || 0,
      bill_number: po.billNumber || null,
      bilty_number: po.biltyNumber || null,
      transporter_name: po.transporterName || null,
      amount_paid: Number(po.amountPaid) || 0,
      payment_status: po.paymentStatus || null,
      is_stock_received: po.isStockReceived ?? false,
      is_billed: po.isBilled ?? false,
      notes: po.notes || null,
      updated_at: new Date().toISOString(),
    }));
    const poRes = await exactSyncRows(client, 'purchase_orders', poRows, 'id');
    if (!poRes.success) return { success: false, vendorCount: vendors.length, purchaseCount: 0, poCount: 0, error: poRes.error };`);

code = code.replace(/    if \(purchases\.length > 0\) \{\n      const purchaseRows = purchases\.map\(p => \(\{[\s\S]*?\}\)\);\n      const res = await exactSyncRows\(client, 'purchases', purchaseRows, 'id'\);\n      if \(!res\.success\) return \{ success: false, vendorCount: vendors\.length, purchaseCount: 0, poCount: purchaseOrders\.length, error: res\.error \};\n    \}/, `    const purchaseRows = purchases.map(p => ({
      id: p.id,
      bill_number: p.billNumber,
      po_number: p.poNumber || null,
      vendor_id: p.vendorId,
      vendor_name: p.vendorName,
      date: p.date,
      items: p.items,
      subtotal: Number(p.subtotal) || 0,
      discount_amount: Number(p.discountAmount) || 0,
      total_amount: Number(p.totalAmount) || 0,
      amount_paid: Number(p.amountPaid) || 0,
      balance_due: Number(p.balanceDue) || 0,
      payment_status: p.paymentStatus,
      bilty_number: p.biltyNumber || null,
      transporter_name: p.transporterName || null,
      cargo_cost: Number(p.cargoCost) || 0,
      notes: p.notes || null,
    }));
    const purRes = await exactSyncRows(client, 'purchases', purchaseRows, 'id');
    if (!purRes.success) return { success: false, vendorCount: vendors.length, purchaseCount: 0, poCount: purchaseOrders.length, error: purRes.error };`);

// syncStaffAndDevicesToSupabase
code = code.replace(/    if \(employees\.length > 0\) \{\n      const empRows = employees\.map\(e => \(\{[\s\S]*?\}\)\);\n      const \{ error \} = await client\.from\('employee_accounts'\)\.upsert\(empRows, \{ onConflict: 'id' \}\);\n      if \(error\) return \{ success: false, employeeCount: 0, deviceCount: 0, error: error\.message \};\n    \}/, `    const empRows = employees.map(e => ({
      id: e.id,
      name: e.name,
      role: e.role,
      pin: e.pin,
      password: e.password || null,
      biometric_credential_id: e.biometricCredentialId || null,
      biometrics_enabled: e.biometricsEnabled ?? false,
      permissions: e.permissions,
      is_active: e.isActive ?? true,
      updated_at: new Date().toISOString(),
    }));
    const empRes = await exactSyncRows(client, 'employee_accounts', empRows, 'id');
    if (!empRes.success) return { success: false, employeeCount: 0, deviceCount: 0, error: empRes.error };`);

code = code.replace(/    if \(devices\.length > 0\) \{\n      const devRows = devices\.map\(d => \(\{[\s\S]*?\}\)\);\n      const \{ error \} = await client\.from\('registered_devices'\)\.upsert\(devRows, \{ onConflict: 'id' \}\);\n      if \(error\) return \{ success: false, employeeCount: employees\.length, deviceCount: 0, error: error\.message \};\n    \}/, `    const devRows = devices.map(d => ({
      id: d.id,
      device_name: d.deviceName,
      user_agent: d.userAgent,
      registered_at: d.registeredAt,
      last_active: d.lastActive,
      is_trusted: d.isTrusted,
      employee_id: d.employeeId,
      employee_name: d.employeeName
    }));
    const devRes = await exactSyncRows(client, 'registered_devices', devRows, 'id');
    if (!devRes.success) return { success: false, employeeCount: employees.length, deviceCount: 0, error: devRes.error };`);

// syncMasterDataToSupabase
code = code.replace(/    if \(brands\.length > 0\) \{\n      const brandRows = brands\.map\(b => \(\{ id: b\.id, name: b\.name, item_count: b\.itemCount \|\| 0 \}\)\);\n      await exactSyncRows\(client, 'brands', brandRows, 'id'\);\n    \}/, `    const brandRows = brands.map(b => ({ id: b.id, name: b.name, item_count: b.itemCount || 0 }));
    await exactSyncRows(client, 'inventory_brands', brandRows, 'id');`);

code = code.replace(/    if \(types\.length > 0\) \{\n      const typeRows = types\.map\(t => \(\{ id: t\.id, name: t\.name, item_count: t\.itemCount \|\| 0 \}\)\);\n      await exactSyncRows\(client, 'types', typeRows, 'id'\);\n    \}/, `    const typeRows = types.map(t => ({ id: t.id, name: t.name, item_count: t.itemCount || 0 }));
    await exactSyncRows(client, 'inventory_categories', typeRows, 'id');`);

code = code.replace(/    if \(locations\.length > 0\) \{\n      const locRows = locations\.map\(l => \(\{ id: l\.id, name: l\.name, cabins: l\.cabins \|\| \[\] \}\)\);\n      await exactSyncRows\(client, 'locations', locRows, 'id'\);\n    \}/, `    const locRows = locations.map(l => ({ id: l.id, name: l.name, cabins: l.cabins || [] }));
    await exactSyncRows(client, 'inventory_locations', locRows, 'id');`);

fs.writeFileSync('src/services/supabase.ts', code);
console.log('patched individual syncs');
