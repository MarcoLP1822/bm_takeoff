#!/usr/bin/env node

/**
 * Script per verificare la completezza delle traduzioni
 * Task 0.2 del Piano di Internazionalizzazione
 */

const fs = require('fs');
const path = require('path');

/**
 * Carica e analizza i file di traduzione
 */
function loadTranslationFiles() {
  const messagesDir = path.join(process.cwd(), 'messages');
  const files = fs.readdirSync(messagesDir).filter(file => file.endsWith('.json'));
  
  const translations = {};
  
  for (const file of files) {
    const locale = path.basename(file, '.json');
    const filePath = path.join(messagesDir, file);
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      translations[locale] = JSON.parse(content);
      console.log(`✅ Caricato ${file}`);
    } catch (error) {
      console.error(`❌ Errore caricando ${file}:`, error.message);
    }
  }
  
  return translations;
}

/**
 * Ottiene tutte le chiavi da un oggetto annidato
 */
function getAllKeys(obj, prefix = '') {
  const keys = [];
  
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

/**
 * Confronta le traduzioni tra lingue
 */
function compareTranslations(translations) {
  const locales = Object.keys(translations);
  
  if (locales.length < 2) {
    console.log('⚠️ Servono almeno 2 file di traduzione per il confronto');
    return;
  }
  
  console.log('\n🔍 ANALISI COMPLETEZZA TRADUZIONI');
  console.log('=====================================');
  
  // Usa il primo locale come riferimento
  const referenceLocale = locales[0];
  const referenceKeys = getAllKeys(translations[referenceLocale]);
  
  console.log(`📋 Locale di riferimento: ${referenceLocale}`);
  console.log(`📊 Chiavi totali di riferimento: ${referenceKeys.length}`);
  
  const results = {};
  
  // Controlla ogni altro locale
  for (let i = 1; i < locales.length; i++) {
    const currentLocale = locales[i];
    const currentKeys = getAllKeys(translations[currentLocale]);
    
    console.log(`\n📋 Analizzando ${currentLocale}:`);
    console.log(`📊 Chiavi totali: ${currentKeys.length}`);
    
    // Trova chiavi mancanti
    const missingKeys = referenceKeys.filter(key => !currentKeys.includes(key));
    const extraKeys = currentKeys.filter(key => !referenceKeys.includes(key));
    
    const completeness = ((currentKeys.length - extraKeys.length) / referenceKeys.length * 100).toFixed(1);
    
    results[currentLocale] = {
      totalKeys: currentKeys.length,
      missingKeys,
      extraKeys,
      completeness: parseFloat(completeness)
    };
    
    console.log(`📈 Completezza: ${completeness}%`);
    
    if (missingKeys.length > 0) {
      console.log(`❌ Chiavi mancanti (${missingKeys.length}):`);
      missingKeys.slice(0, 10).forEach(key => console.log(`   - ${key}`));
      if (missingKeys.length > 10) {
        console.log(`   ... e altre ${missingKeys.length - 10} chiavi`);
      }
    }
    
    if (extraKeys.length > 0) {
      console.log(`➕ Chiavi extra (${extraKeys.length}):`);
      extraKeys.slice(0, 5).forEach(key => console.log(`   + ${key}`));
      if (extraKeys.length > 5) {
        console.log(`   ... e altre ${extraKeys.length - 5} chiavi`);
      }
    }
    
    if (missingKeys.length === 0 && extraKeys.length === 0) {
      console.log('✅ Perfettamente sincronizzato!');
    }
  }
  
  return results;
}

/**
 * Genera un report dettagliato
 */
function generateReport(translations, results) {
  console.log('\n📊 RIEPILOGO FINALE');
  console.log('==================');
  
  const locales = Object.keys(translations);
  const referenceLocale = locales[0];
  const referenceKeys = getAllKeys(translations[referenceLocale]);
  
  console.log(`\n📋 Struttura delle traduzioni (${referenceLocale}):`);
  
  // Analizza la struttura
  const structure = {};
  referenceKeys.forEach(key => {
    const namespace = key.split('.')[0];
    if (!structure[namespace]) {
      structure[namespace] = 0;
    }
    structure[namespace]++;
  });
  
  Object.entries(structure).forEach(([namespace, count]) => {
    console.log(`   ${namespace}: ${count} chiavi`);
  });
  
  console.log(`\n📊 Stato traduzioni per locale:`);
  
  // Mostra completezza per ogni locale
  locales.forEach((locale, index) => {
    if (index === 0) {
      console.log(`   ${locale}: 100.0% (riferimento) - ${referenceKeys.length} chiavi`);
    } else {
      const result = results[locale];
      const status = result.completeness >= 99 ? '✅' : 
                   result.completeness >= 90 ? '⚠️' : '❌';
      console.log(`   ${locale}: ${result.completeness}% ${status} - ${result.totalKeys} chiavi`);
    }
  });
  
  // Raccomandazioni
  console.log('\n🎯 RACCOMANDAZIONI:');
  console.log('===================');
  
  let hasIssues = false;
  
  Object.entries(results).forEach(([locale, result]) => {
    if (result.completeness < 100) {
      hasIssues = true;
      console.log(`\n${locale}:`);
      
      if (result.missingKeys.length > 0) {
        console.log(`  🔴 Aggiungi ${result.missingKeys.length} chiavi mancanti`);
      }
      
      if (result.extraKeys.length > 0) {
        console.log(`  🟡 Rimuovi o allinea ${result.extraKeys.length} chiavi extra`);
      }
    }
  });
  
  if (!hasIssues) {
    console.log('✅ Tutte le traduzioni sono complete e sincronizzate!');
  }
  
  // Suggerimenti per namespace mancanti più comuni
  console.log('\n💡 PROSSIMI PASSI:');
  console.log('=================');
  console.log('1. Utilizzare i nuovi namespace nelle sezioni del codice:');
  console.log('   - toast.* per i messaggi toast');
  console.log('   - errors.* per i messaggi di errore');
  console.log('   - business.* per terminologia aziendale');
  console.log('2. Aggiornare il file toast-service.ts per usare t("toast.xxx")');
  console.log('3. Aggiornare gli endpoint API per usare t("errors.xxx")');
}

/**
 * Salva un report JSON dettagliato
 */
function saveDetailedReport(translations, results) {
  const reportPath = path.join(process.cwd(), 'translation-completeness-report.json');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalLocales: Object.keys(translations).length,
      referenceLocale: Object.keys(translations)[0],
      totalKeysInReference: getAllKeys(translations[Object.keys(translations)[0]]).length
    },
    results,
    detailedStructure: {}
  };
  
  // Aggiungi struttura dettagliata per ogni locale
  Object.entries(translations).forEach(([locale, data]) => {
    const keys = getAllKeys(data);
    const structure = {};
    
    keys.forEach(key => {
      const namespace = key.split('.')[0];
      if (!structure[namespace]) {
        structure[namespace] = [];
      }
      structure[namespace].push(key);
    });
    
    report.detailedStructure[locale] = structure;
  });
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Report dettagliato salvato in: ${reportPath}`);
}

/**
 * Funzione principale
 */
function main() {
  console.log('🚀 Avvio verifica completezza traduzioni...\n');
  
  try {
    const translations = loadTranslationFiles();
    
    if (Object.keys(translations).length === 0) {
      console.error('❌ Nessun file di traduzione trovato in /messages/');
      process.exit(1);
    }
    
    const results = compareTranslations(translations);
    
    if (results) {
      generateReport(translations, results);
      saveDetailedReport(translations, results);
    }
    
    console.log('\n✨ Verifica completata!');
    
    // Exit code basato sulla completezza
    const allComplete = Object.values(results || {}).every(r => r.completeness >= 99);
    process.exit(allComplete ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Errore durante la verifica:', error.message);
    process.exit(1);
  }
}

// Esegui lo script
if (require.main === module) {
  main();
}

module.exports = { main, loadTranslationFiles, compareTranslations };
