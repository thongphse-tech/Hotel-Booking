import { query } from "../config/database.js";

export const userRepo = {
  findByEmail: async (email) => (await query(
    `SELECT ua.accountid, ua.username, ua.passwordhash, ua.role, ua.isactive,
            ua.failedloginattempts, ua.lockeduntil, ua.tokenversion,
            c.customerid, c.fullname, c.email, c.phone, c.address
     FROM useraccount ua
     LEFT JOIN customer c ON c.accountid = ua.accountid
     WHERE lower(c.email) = $1 OR lower(ua.username) = $1
     LIMIT 1`,
    [email]
  )).rows[0],
  findById: async (id) => (await query("SELECT ua.accountid, ua.username, ua.role, ua.isactive, ua.tokenversion, c.customerid, c.fullname, c.email, c.phone, c.address FROM useraccount ua LEFT JOIN customer c ON c.accountid = ua.accountid WHERE ua.accountid = $1", [id])).rows[0],
  findCustomerProfile: async (customerId, accountId) => (await query(
    "SELECT c.customerid AS \"customerId\", c.fullname AS \"fullName\", c.email, c.phone, c.address FROM customer c WHERE c.customerid = $1 AND c.accountid = $2",
    [customerId, accountId]
  )).rows[0],
  findCustomerProfileForUpdate: async (client, customerId, accountId) => (await client.query(
    "SELECT c.customerid AS \"customerId\", c.fullname AS \"fullName\", c.email, c.phone, c.address, ua.passwordhash FROM customer c JOIN useraccount ua ON ua.accountid = c.accountid WHERE c.customerid = $1 AND c.accountid = $2 FOR UPDATE OF c, ua",
    [customerId, accountId]
  )).rows[0],
  updateCustomerProfile: async (client, customerId, accountId, { fullName, phone, address }) => (await client.query(
    "UPDATE customer SET fullname = $3, phone = $4, address = $5 WHERE customerid = $1 AND accountid = $2 RETURNING customerid AS \"customerId\", fullname AS \"fullName\", email, phone, address",
    [customerId, accountId, fullName, phone, address]
  )).rows[0],
  updatePasswordWithClient: (client, accountId, passwordHash) => client.query(
    "UPDATE useraccount SET passwordhash = $2 WHERE accountid = $1",
    [accountId, passwordHash]
  ),
  create: async (client, { username, passwordHash, fullName, email, phone, address }) => {
    const account = (await client.query("INSERT INTO useraccount (username, passwordhash, role, isactive) VALUES ($1, $2, 'customer', true) RETURNING accountid, username, role", [username, passwordHash])).rows[0];
    const customer = (await client.query("INSERT INTO customer (accountid, fullname, email, phone, address) VALUES ($1, $2, $3, $4, $5) RETURNING customerid, fullname, email, phone, address", [account.accountid, fullName, email, phone || null, address || null])).rows[0];
    return { ...account, ...customer };
  },
  recordLoginFailure: (id, attempts, lockedUntil) => query("UPDATE useraccount SET failedloginattempts = $2, lockeduntil = $3 WHERE accountid = $1", [id, attempts, lockedUntil]),
  resetLoginFailures: (id) => query("UPDATE useraccount SET failedloginattempts = 0, lockeduntil = NULL WHERE accountid = $1", [id]),
  revokeSessions: (id) => query("UPDATE useraccount SET tokenversion = tokenversion + 1 WHERE accountid = $1", [id]),
  updateProfile: async (id, { fullName, phone, address }) => (await query("UPDATE customer SET fullname = COALESCE($2, fullname), phone = COALESCE($3, phone), address = COALESCE($4, address) WHERE accountid = $1 RETURNING customerid, fullname, email, phone, address", [id, fullName ?? null, phone ?? null, address ?? null])).rows[0],
  updatePassword: (id, passwordHash) => query("UPDATE useraccount SET passwordhash = $2 WHERE accountid = $1", [id, passwordHash]),
  listCustomers: () => query("SELECT c.customerid, c.fullname, c.email, c.phone, c.address, ua.isactive, c.createdat FROM customer c JOIN useraccount ua ON ua.accountid = c.accountid ORDER BY c.customerid"),
  setActive: (id, active) => query("UPDATE useraccount SET isactive = $2 WHERE accountid = (SELECT accountid FROM customer WHERE customerid = $1) RETURNING accountid, isactive", [id, active])
};
