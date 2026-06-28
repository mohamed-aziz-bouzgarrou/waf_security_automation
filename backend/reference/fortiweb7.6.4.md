# FortiWeb 7.6.4 CLI Reference — Verified Commands

# ═══════════════════════════════════════════════════

# VERIFIED AGAINST LIVE DEVICE — DO NOT MODIFY VALUES

# ═══════════════════════════════════════════════════

---

# SCOPE — WHAT THIS REFERENCE COVERS

This reference covers ONLY the following remediations:

1. HTTP header security (x-frame-options, x-content-type-options, x-xss-protection)
2. Signature-based attack protection (SQLi, XSS, known exploits)
3. Attaching header security policy to a web protection profile
4. Attaching signature rule to a web protection profile
5. Attaching web protection profile to a server policy

ANY issue that cannot be fully remediated using ONLY the commands in this
reference MUST be placed in warnings[] and excluded from commands[].
No exceptions. Do not attempt partial fixes.

---

# 1. HTTP Header Security

## SYNTAX

config waf http-header-security
edit "<policy-name>"
config http-header-security-list
edit <id>
set name <NAME>
set value <VALUE>
next
end
next
end

## VALID name → value PAIRS (device-verified)

| set name               | set value       |
| ---------------------- | --------------- |
| x-frame-options        | deny            |
| x-frame-options        | sameorigin      |
| x-frame-options        | allow-from      |
| x-content-type-options | nosniff         |
| x-xss-protection       | sanitizing-mode |
| x-xss-protection       | block-mode      |

## GUI-ONLY HEADERS — NEVER GENERATE CLI FOR THESE

| Header                  | Reason                 |
| ----------------------- | ---------------------- |
| content-security-policy | needs free-form string |
| feature-policy          | needs free-form string |
| referrer-policy         | needs free-form string |

## ATTACH TO PROFILE

config waf web-protection-profile inline-protection
edit "<profile-name>"
set http-header-security "<policy-name>"
next
end

## HARD RULES

- ONLY use name/value pairs from the verified table above
- GUI-only headers go in warnings[], never in commands[]
- Inner block is lowercase: config http-header-security-list
- Never guess or invent a set value
- If a ZAP finding requires a header not in the table above, put it in warnings[]

---

# 2. Signature-Based Attack Protection (SQLi, XSS, etc.)

## SYNTAX

config waf signature
edit "<policy-name>"
set sensitivity-level <1|2|3|4>
set comment "<comment>"
config main_class_list
edit <CLASS_ID>
set action <ACTION>
set severity <SEVERITY>
set status enable
next
end
next
end

## VALID sensitivity-level VALUES (device-verified)

| Level | Description        |
| ----- | ------------------ |
| 1     | Low — least strict |
| 2     | Medium-Low         |
| 3     | Medium-High        |
| 4     | High — most strict |

## VALID CLASS IDs (device-verified)

| Class ID  | Attack Type              |
| --------- | ------------------------ |
| 010000000 | XSS                      |
| 020000000 | XSS Extended             |
| 030000000 | SQL Injection            |
| 040000000 | SQLi Extended            |
| 050000000 | Generic Attacks          |
| 060000000 | Generic Attacks Extended |
| 070000000 | Trojans                  |
| 080000000 | Information Disclosure   |
| 090000000 | Known Exploits           |

## VALID action VALUES (device-verified)

| Action                 | Description                              |
| ---------------------- | ---------------------------------------- |
| alert                  | Log only, no blocking                    |
| alert_deny             | Log and block the request                |
| block_period           | Block for a time period (1-3600 seconds) |
| client-id-block-period | Block client ID for a time period        |
| deny_no_log            | Block silently, no log                   |
| redirect               | Redirect the request                     |
| send_http_response     | Reply with custom HTTP response          |

## VALID severity VALUES (device-verified)

| Severity |
| -------- |
| High     |
| Medium   |
| Low      |
| Info     |

## BLOCK PERIOD

- Only used when action is block_period or client-id-block-period
- set block-period <1-3600> (seconds)

## EXAMPLE — Enable SQLi + XSS Protection

config waf signature
edit "owasp-policy"
set sensitivity-level 4
set comment "OWASP ZAP findings remediation"
config main_class_list
edit 010000000
set action alert_deny
set severity High
set status enable
next
edit 020000000
set action alert_deny
set severity High
set status enable
next
edit 030000000
set action alert_deny
set severity High
set status enable
next
edit 040000000
set action alert_deny
set severity High
set status enable
next
end
next
end

## ATTACH TO PROFILE

config waf web-protection-profile inline-protection
edit "<profile-name>"
set signature-rule "<policy-name>"
next
end

## HARD RULES

- Class IDs only from 010000000 to 090000000 — never use 100000000 or above
- block-period only valid when action is block_period or client-id-block-period
- Only one signature-rule can be attached per protection profile
- Never use "set sql-injection enable" — this parameter does not exist
- sensitivity-level only accepts: 1 2 3 4
- severity values are case-sensitive: High, Medium, Low, Info

---

# 3. Web Protection Profile

## SYNTAX

config waf web-protection-profile inline-protection
edit "<profile-name>"
set http-header-security "<header-policy-name>"
set signature-rule "<signature-policy-name>"
next
end

## HARD RULES

- Only one http-header-security policy per profile
- Only one signature-rule per profile
- Profile must exist before attaching to a server policy
- set statements are independent — each can be used alone in an edit block
- Never add any set parameter not listed in this reference

---

# 4. Server Policy

## ATTACH WEB PROTECTION PROFILE ONLY

config server-policy policy
edit "<policy-name>"
set web-protection-profile "<profile-name>"
next
end

## HARD RULES

- Use "config server-policy policy" — NOT "config waf policy" (does not exist)
- Never nest "config policy" inside "config waf web-protection-profile" — wrong context
- Only "set web-protection-profile" is verified for this section
- Never use any other set parameter under server policy — nothing else is verified

---

# ISSUE → REMEDIATION MAPPING

Use this table to decide whether a ZAP finding can be fixed via CLI or not.

| ZAP Finding                      | CLI Remediation Available | Reference Section          |
| -------------------------------- | ------------------------- | -------------------------- |
| Missing X-Frame-Options          | ✅ Yes                    | Section 1                  |
| Missing X-Content-Type-Options   | ✅ Yes                    | Section 1                  |
| Missing X-XSS-Protection         | ✅ Yes                    | Section 1                  |
| Missing CSP Header               | ❌ No — GUI only          | Section 1 (GUI-only table) |
| Missing Feature-Policy           | ❌ No — GUI only          | Section 1 (GUI-only table) |
| Missing Referrer-Policy          | ❌ No — GUI only          | Section 1 (GUI-only table) |
| SQL Injection                    | ✅ Yes                    | Section 2                  |
| XSS                              | ✅ Yes                    | Section 2                  |
| Known Exploits / Generic Attacks | ✅ Yes                    | Section 2                  |
| Path Traversal                   | ❌ No — not in reference  | warnings[] only            |
| HTTP Only Site                   | ❌ No — GUI only          | warnings[] only            |
| HTTP to HTTPS Redirect           | ❌ No — not in reference  | warnings[] only            |
| HSTS Missing                     | ❌ No — not in reference  | warnings[] only            |
| Any other finding                | ❌ No                     | warnings[] only            |

---

# GLOBAL HARD RULES (apply to all sections)

- Never invent parameters — only use device-verified values in this reference
- Never generate commands for a finding marked ❌ in the mapping table above
- GUI-only items must go in warnings[], never in commands[]
- Unrecognized findings must go in warnings[], never in commands[]
- Use "config server-policy policy" for server policy — never "config waf policy"
- Never nest a policy edit inside a profile edit — they are separate top-level configs
- Never use "set https-redirect enable" — not verified on device
- Never use "set protocol HTTPS" — does not exist
- Never use "set redirect-http-to-https enable" — does not exist
- If a finding is not covered by this reference, put it in warnings[] and stop
- When in doubt, flag in warnings[] — do not guess
