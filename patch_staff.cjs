const fs = require('fs');
let code = fs.readFileSync('src/services/supabase.ts', 'utf-8');

const oldEmp = `    if (employees.length > 0) {
      const empRows = employees.map(e => ({
        id: e.id,
        name: e.name,
        email: e.email,
        phone: e.phone || null,
        pin: e.pin,
        password: e.password || null,
        role: e.role,
        designation: e.designation,
        status: e.status,
        permissions: e.permissions,
        restrict_to_devices: e.restrictToDevices ?? false,
        allowed_device_ids: e.allowedDeviceIds || [],
        avatar_color: e.avatarColor || null,
        last_login_at: e.lastLoginAt || null,
        last_login_device_id: e.lastLoginDeviceId || null,
        notes: e.notes || null,
      }));
      const { error } = await client.from('employee_accounts').upsert(empRows, { onConflict: 'id' });
      if (error) return { success: false, employeeCount: 0, deviceCount: 0, error: error.message };
    }`;

const newEmp = `    const empRows = employees.map(e => ({
      id: e.id,
      name: e.name,
      email: e.email,
      phone: e.phone || null,
      pin: e.pin,
      password: e.password || null,
      role: e.role,
      designation: e.designation,
      status: e.status,
      permissions: e.permissions,
      restrict_to_devices: e.restrictToDevices ?? false,
      allowed_device_ids: e.allowedDeviceIds || [],
      avatar_color: e.avatarColor || null,
      last_login_at: e.lastLoginAt || null,
      last_login_device_id: e.lastLoginDeviceId || null,
      notes: e.notes || null,
    }));
    const empRes = await exactSyncRows(client, 'employee_accounts', empRows, 'id');
    if (!empRes.success) return { success: false, employeeCount: 0, deviceCount: 0, error: empRes.error };`;
code = code.replace(oldEmp, newEmp);

const oldDev = `    if (devices.length > 0) {
      const devRows = devices.map(d => ({
        id: d.id,
        name: d.name,
        os: d.os,
        device_type: d.deviceType,
        browser: d.browser || null,
        user_agent: d.userAgent || null,
        registered_at: d.registeredAt,
        last_seen_at: d.lastSeenAt,
        is_trusted: d.isTrusted ?? true,
        notes: d.notes || null,
      }));
      const { error } = await client.from('registered_devices').upsert(devRows, { onConflict: 'id' });
      if (error) return { success: false, employeeCount: employees.length, deviceCount: 0, error: error.message };
    }`;

const newDev = `    const devRows = devices.map(d => ({
      id: d.id,
      name: d.name,
      os: d.os,
      device_type: d.deviceType,
      browser: d.browser || null,
      user_agent: d.userAgent || null,
      registered_at: d.registeredAt,
      last_seen_at: d.lastSeenAt,
      is_trusted: d.isTrusted ?? true,
      notes: d.notes || null,
    }));
    const devRes = await exactSyncRows(client, 'registered_devices', devRows, 'id');
    if (!devRes.success) return { success: false, employeeCount: employees.length, deviceCount: 0, error: devRes.error };`;
code = code.replace(oldDev, newDev);

fs.writeFileSync('src/services/supabase.ts', code);
