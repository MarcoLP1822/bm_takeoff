#!/usr/bin/env node

/**
 * Script per l'audit automatico delle stringhe hardcoded
 * Fase 0.1 del Piano di Internazionalizzazione
 */

const fs = require('fs');
const path = require('path');

// Configurazione dell'audit
const config = {
  // Directory da scansionare
  directories: [
    'app',
    'components', 
    'lib',
    'hooks'
  ],
  
  // Estensioni di file da controllare
  fileExtensions: ['.tsx', '.ts', '.jsx', '.js'],
  
  // Directory da escludere
  excludeDirectories: [
    'node_modules',
    '.next',
    '.git',
    'dist',
    'build',
    '__tests__',
    '__mocks__'
  ],
  
  // File da escludere
  excludeFiles: [
    'globals.css',
    'tailwind.config.js',
    'next.config.ts'
  ],
  
  // Pattern per identificare stringhe hardcoded
  patterns: {
    // Stringhe tra virgolette che potrebbero essere testo utente
    userVisibleStrings: /"[A-Z][A-Za-z\s.,!?:;'-]{3,}"/g,
    // Template literals con testo
    templateLiterals: /`[A-Z][A-Za-z\s.,!?:;'-]{3,}`/g,
    // Toast messages
    toastMessages: /(toast\.(success|error|warning|info|loading))\s*\(\s*["'`]([^"'`]+)["'`]/g,
    // Console logs con messaggi
    consoleLogs: /console\.(log|error|warn|info)\s*\(\s*["'`]([^"'`]+)["'`]/g,
    // Placeholder text
    placeholders: /(placeholder|title|alt|aria-label)\s*=\s*["']([A-Za-z\s.,!?:;'-]{3,})["']/g
  }
};

// Risultati dell'audit
const auditResults = {
  totalFiles: 0,
  filesWithIssues: 0,
  totalIssues: 0,
  issues: {},
  summary: {
    toastMessages: 0,
    userVisibleStrings: 0,
    templateLiterals: 0,
    consoleLogs: 0,
    placeholders: 0
  }
};

/**
 * Controlla se un file deve essere escluso
 */
function shouldExcludeFile(filePath) {
  const fileName = path.basename(filePath);
  const dirName = path.dirname(filePath);
  
  // Escludi file specifici
  if (config.excludeFiles.includes(fileName)) return true;
  
  // Escludi directory
  for (const excludeDir of config.excludeDirectories) {
    if (dirName.includes(excludeDir)) return true;
  }
  
  // Escludi file che non hanno le estensioni giuste
  const ext = path.extname(filePath);
  return !config.fileExtensions.includes(ext);
}

/**
 * Scansiona un file per stringhe hardcoded
 */
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileIssues = [];
    
    // Scansiona per ogni pattern
    Object.entries(config.patterns).forEach(([patternName, pattern]) => {
      let match;
      const globalPattern = new RegExp(pattern.source, 'g');
      
      while ((match = globalPattern.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        const lineContent = content.split('\n')[lineNumber - 1].trim();
        
        // Filtra falsi positivi
        if (shouldIgnoreMatch(match[0], lineContent, patternName)) {
          continue;
        }
        
        fileIssues.push({
          type: patternName,
          match: match[0],
          line: lineNumber,
          lineContent: lineContent,
          suggestion: generateSuggestion(match[0], patternName)
        });
        
        auditResults.summary[patternName]++;
      }
    });
    
    if (fileIssues.length > 0) {
      auditResults.issues[filePath] = fileIssues;
      auditResults.filesWithIssues++;
      auditResults.totalIssues += fileIssues.length;
    }
    
    auditResults.totalFiles++;
    
  } catch (error) {
    console.warn(`Errore leggendo il file ${filePath}:`, error.message);
  }
}

/**
 * Filtra i falsi positivi
 */
function shouldIgnoreMatch(match, lineContent, patternName) {
  // Ignora stringhe che sono chiaramente codice
  const codePatterns = [
    /^"use (client|server)"$/,
    /^"[a-z-]+\/[a-z-]+"$/, // imports
    /^"[a-z]+:[a-z-]+"$/, // CSS properties
    /^"\.[a-z-]+"$/, // CSS classes
    /^"#[0-9a-fA-F]+"$/, // Colors
    /^"[0-9]+px"$/, // CSS values
    /^"auto|none|inherit|initial"$/, // CSS values
    /className|import|from|export/,
    /^"(sm|md|lg|xl):"/, // Tailwind breakpoints
    /^"bg-|text-|border-|hover:"/ // Tailwind classes
  ];
  
  for (const pattern of codePatterns) {
    if (pattern.test(match)) {
      return true;
    }
  }
  
  // Ignora linee che sono commenti
  if (lineContent.includes('//') && lineContent.indexOf('//') < lineContent.indexOf(match)) {
    return true;
  }
  
  // Ignora se già usa funzioni di traduzione
  if (lineContent.includes('t(') || lineContent.includes('getTranslations')) {
    return true;
  }
  
  return false;
}

/**
 * Genera suggerimenti per la risoluzione
 */
function generateSuggestion(match, patternName) {
  const text = match.replace(/["`']/g, '').trim();
  const key = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '');
  
  switch (patternName) {
    case 'toastMessages':
      return `t('messages.${key}')`;
    case 'userVisibleStrings':
      return `t('common.${key}')`;
    case 'placeholders':
      return `t('forms.${key}')`;
    default:
      return `t('${key}')`;
  }
}

/**
 * Scansiona ricorsivamente una directory
 */
function scanDirectory(dirPath) {
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!config.excludeDirectories.includes(item)) {
          scanDirectory(fullPath);
        }
      } else if (stat.isFile()) {
        if (!shouldExcludeFile(fullPath)) {
          scanFile(fullPath);
        }
      }
    }
  } catch (error) {
    console.warn(`Errore scansionando la directory ${dirPath}:`, error.message);
  }
}

/**
 * Genera il report dell'audit
 */
function generateReport() {
  console.log('\n🔍 AUDIT DELLE STRINGHE HARDCODED');
  console.log('=====================================');
  console.log(`📊 File scansionati: ${auditResults.totalFiles}`);
  console.log(`⚠️  File con problemi: ${auditResults.filesWithIssues}`);
  console.log(`🚨 Problemi totali: ${auditResults.totalIssues}`);
  
  console.log('\n📈 Riepilogo per categoria:');
  Object.entries(auditResults.summary).forEach(([category, count]) => {
    if (count > 0) {
      console.log(`   ${category}: ${count} problemi`);
    }
  });
  
  if (auditResults.totalIssues === 0) {
    console.log('\n✅ Nessuna stringa hardcoded trovata!');
    return;
  }
  
  console.log('\n📝 DETTAGLI DEI PROBLEMI TROVATI:');
  console.log('==================================');
  
  Object.entries(auditResults.issues).forEach(([filePath, issues]) => {
    console.log(`\n📄 ${filePath.replace(process.cwd(), '.')}`);
    console.log('-'.repeat(50));
    
    issues.forEach((issue, index) => {
      console.log(`\n${index + 1}. Linea ${issue.line} [${issue.type}]:`);
      console.log(`   Trovato: ${issue.match}`);
      console.log(`   Contesto: ${issue.lineContent.substring(0, 80)}${issue.lineContent.length > 80 ? '...' : ''}`);
      console.log(`   Suggerimento: ${issue.suggestion}`);
    });
  });
  
  console.log('\n🎯 PRIORITÀ DI RISOLUZIONE:');
  console.log('===========================');
  console.log('1. 🔴 ALTA: Toast messages e messaggi di errore');
  console.log('2. 🟡 MEDIA: Stringhe UI visibili all\'utente');
  console.log('3. 🟢 BASSA: Placeholder e console logs');
}

/**
 * Salva il report su file
 */
function saveReport() {
  const reportPath = path.join(process.cwd(), 'audit-hardcoded-strings-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    summary: auditResults.summary,
    totalFiles: auditResults.totalFiles,
    filesWithIssues: auditResults.filesWithIssues,
    totalIssues: auditResults.totalIssues,
    issues: auditResults.issues
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Report salvato in: ${reportPath}`);
}

/**
 * Funzione principale
 */
function main() {
  console.log('🚀 Avvio audit delle stringhe hardcoded...\n');
  
  // Scansiona ogni directory configurata
  for (const dir of config.directories) {
    const dirPath = path.join(process.cwd(), dir);
    if (fs.existsSync(dirPath)) {
      console.log(`📁 Scansionando ${dir}/...`);
      scanDirectory(dirPath);
    } else {
      console.warn(`⚠️  Directory non trovata: ${dir}`);
    }
  }
  
  // Genera e salva il report
  generateReport();
  saveReport();
  
  console.log('\n✨ Audit completato!');
  
  // Exit code basato sui risultati
  process.exit(auditResults.totalIssues > 0 ? 1 : 0);
}

// Esegui lo script
if (require.main === module) {
  main();
}

module.exports = { main, config, auditResults };
