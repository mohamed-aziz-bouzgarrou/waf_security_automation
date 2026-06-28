/**
 * FortiWeb Commands Generator
 * Converts structured JSON issues into FortiWeb CLI commands
 */

const generateFortiWebCommands = (structured) => {
  const commands = [];

  if (!structured || !structured.issues || !Array.isArray(structured.issues)) {
    return commands;
  }

  structured.issues.forEach((issue) => {
    if (!issue.fix || !issue.fix.config) {
      return;
    }

    const fixType = issue.fix.type;
    const config = issue.fix.config;

    let command;

    switch (fixType) {
      case "CLICKJACKING_PROTECTION":
        if (config.header === "X-Frame-Options" && config.value) {
          command = `config waf custom-header\n  set header-name "X-Frame-Options"\n  set header-value "${config.value}"\n  next`;
        }
        break;

      case "CSP":
        if (config.header === "Content-Security-Policy" && config.value) {
          command = `config waf custom-header\n  set header-name "Content-Security-Policy"\n  set header-value "${config.value}"\n  next`;
        }
        break;

      case "MIME_SNIFFING":
        if (
          config.header === "X-Content-Type-Options" &&
          config.value
        ) {
          command = `config waf custom-header\n  set header-name "X-Content-Type-Options"\n  set header-value "${config.value}"\n  next`;
        }
        break;

      case "HSTS":
        if (config.header === "Strict-Transport-Security" && config.value) {
          command = `config waf custom-header\n  set header-name "Strict-Transport-Security"\n  set header-value "${config.value}"\n  next`;
        }
        break;

      case "XXSS_PROTECTION":
        if (config.header === "X-XSS-Protection" && config.value) {
          command = `config waf custom-header\n  set header-name "X-XSS-Protection"\n  set header-value "${config.value}"\n  next`;
        }
        break;

      default:
        // Generic header handling
        if (config.header && config.value) {
          command = `config waf custom-header\n  set header-name "${config.header}"\n  set header-value "${config.value}"\n  next`;
        }
    }

    if (command) {
      commands.push(command);
    }
  });

  return commands;
};

module.exports = {
  generateFortiWebCommands,
};
