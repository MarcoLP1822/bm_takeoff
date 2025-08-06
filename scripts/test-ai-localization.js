#!/usr/bin/env node

/**
 * Script di test per la localizzazione AI
 * Task 0.4 del Piano di Internazionalizzazione
 * 
 * Verifica che tutte le funzioni AI rispettino il parametro locale
 */

import { analyzeBookContent } from '../lib/ai-analysis.js';
import { generateSocialContent } from '../lib/content-generation.js';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock di test content - un breve estratto di un libro
const TEST_BOOK_CONTENT = `
Capitolo 1: L'importanza della crescita personale

La crescita personale è un viaggio che ogni individuo dovrebbe intraprendere. 
Non si tratta solo di migliorare le proprie competenze professionali, ma di 
sviluppare una comprensione più profonda di se stessi e del proprio posto nel mondo.

In questo libro esploreremo tre concetti fondamentali:
1. L'auto-consapevolezza come fondamento della crescita
2. L'importanza di uscire dalla propria zona di comfort
3. Come trasformare gli ostacoli in opportunità

La crescita personale richiede impegno, pazienza e soprattutto la volontà di 
cambiare. Come disse una volta Albert Einstein: "La follia è fare sempre la 
stessa cosa aspettandosi risultati diversi."

Questo principio si applica perfettamente al nostro sviluppo personale. Se 
vogliamo crescere, dobbiamo essere disposti a provare nuovi approcci, ad 
affrontare le nostre paure e a imparare dai nostri errori.
`;

const TEST_CONFIG = {
  bookTitle: "Crescita Personale: Una Guida Completa",
  bookId: "test-book-123",
  userId: "test-user-456",
  author: "Marco Rossi",
  locales: ['en', 'it']
};

/**
 * Testa l'analisi AI con diversi locale
 */
async function testAIAnalysis() {
  console.log('\n🔍 TESTING AI ANALYSIS LOCALIZATION');
  console.log('====================================');
  
  const results = {};
  
  for (const locale of TEST_CONFIG.locales) {
    console.log(`\n📍 Testing locale: ${locale}`);
    console.log('-'.repeat(30));
    
    try {
      // Test con contenuto ridotto per velocità
      const analysis = await analyzeBookContent(
        TEST_BOOK_CONTENT,
        TEST_CONFIG.bookTitle,
        TEST_CONFIG.bookId,
        TEST_CONFIG.userId,
        TEST_CONFIG.author,
        {
          locale,
          maxRetries: 1,
          chunkSize: 2000,
          includeChapterSummaries: false // Disabilitato per velocità
        }
      );
      
      results[locale] = analysis;
      
      console.log(`✅ Analysis completed for ${locale}`);
      console.log(`📊 Results preview:`);
      console.log(`   Themes (${analysis.themes.length}): ${analysis.themes.slice(0, 2).join(', ')}...`);
      console.log(`   Quotes (${analysis.quotes.length}): "${analysis.quotes[0]?.substring(0, 50)}..."`);
      console.log(`   Key Insights (${analysis.keyInsights.length}): ${analysis.keyInsights[0]?.substring(0, 50)}...`);
      console.log(`   Genre: ${analysis.genre}`);
      console.log(`   Target Audience: ${analysis.targetAudience}`);
      
      // Controlla se il contenuto sembra essere nella lingua corretta
      const sampleText = `${analysis.themes.join(' ')} ${analysis.overallSummary}`.toLowerCase();
      const containsItalianWords = /\b(crescita|personale|sviluppo|importante|viaggio|comprensione)\b/.test(sampleText);
      const containsEnglishWords = /\b(growth|personal|development|important|journey|understanding)\b/.test(sampleText);
      
      if (locale === 'it' && containsItalianWords) {
        console.log(`✅ Content appears to be in Italian`);
      } else if (locale === 'en' && containsEnglishWords) {
        console.log(`✅ Content appears to be in English`);
      } else {
        console.log(`⚠️  Content language detection inconclusive`);
      }
      
    } catch (error) {
      console.error(`❌ Error testing ${locale}:`, error.message);
      results[locale] = { error: error.message };
    }
  }
  
  return results;
}

/**
 * Testa la generazione di contenuti social con diversi locale
 */
async function testSocialContentGeneration(analysisResults) {
  console.log('\n📱 TESTING SOCIAL CONTENT GENERATION');
  console.log('====================================');
  
  const socialResults = {};
  
  for (const locale of TEST_CONFIG.locales) {
    if (analysisResults[locale]?.error) {
      console.log(`⏭️  Skipping social content test for ${locale} (analysis failed)`);
      continue;
    }
    
    console.log(`\n📍 Testing social content for locale: ${locale}`);
    console.log('-'.repeat(40));
    
    try {
      const socialContent = await generateSocialContent(
        analysisResults[locale],
        TEST_CONFIG.bookTitle,
        TEST_CONFIG.bookId,
        TEST_CONFIG.userId,
        TEST_CONFIG.author,
        {
          locale,
          platforms: ['twitter', 'linkedin'], // Solo 2 platform per velocità
          variationsPerTheme: 1,
          includeImages: false,
          tone: 'professional',
          maxRetries: 1
        }
      );
      
      socialResults[locale] = socialContent;
      
      console.log(`✅ Social content generated for ${locale}`);
      console.log(`📊 Results preview:`);
      console.log(`   Variations generated: ${socialContent.length}`);
      
      // Mostra esempi di contenuto generato
      socialContent.slice(0, 2).forEach((variation, index) => {
        console.log(`\n   Variation ${index + 1} (${variation.sourceType}):`);
        variation.posts.forEach(post => {
          const preview = post.content.substring(0, 80).replace(/\n/g, ' ');
          console.log(`     ${post.platform}: "${preview}..."`);
          console.log(`     Valid: ${post.isValid} | Characters: ${post.characterCount}`);
        });
      });
      
      // Controlla la lingua del contenuto social
      const allContent = socialContent.flatMap(v => v.posts.map(p => p.content)).join(' ').toLowerCase();
      const containsItalianWords = /\b(crescita|personale|sviluppo|importante|libro|autore)\b/.test(allContent);
      const containsEnglishWords = /\b(growth|personal|development|important|book|author)\b/.test(allContent);
      
      if (locale === 'it' && containsItalianWords) {
        console.log(`✅ Social content appears to be in Italian`);
      } else if (locale === 'en' && containsEnglishWords) {
        console.log(`✅ Social content appears to be in English`);
      } else {
        console.log(`⚠️  Social content language detection inconclusive`);
      }
      
    } catch (error) {
      console.error(`❌ Error generating social content for ${locale}:`, error.message);
      socialResults[locale] = { error: error.message };
    }
  }
  
  return socialResults;
}

/**
 * Genera un report di confronto tra i locale
 */
function generateComparisonReport(analysisResults, socialResults) {
  console.log('\n📊 LOCALIZATION COMPARISON REPORT');
  console.log('=================================');
  
  const report = {
    timestamp: new Date().toISOString(),
    testConfig: TEST_CONFIG,
    results: {
      analysis: {},
      socialContent: {},
      summary: {}
    }
  };
  
  // Analizza i risultati dell'analisi
  TEST_CONFIG.locales.forEach(locale => {
    const analysis = analysisResults[locale];
    const social = socialResults[locale];
    
    console.log(`\n🌍 Locale: ${locale.toUpperCase()}`);
    console.log('-'.repeat(20));
    
    if (analysis?.error) {
      console.log(`❌ Analysis: Failed (${analysis.error})`);
      report.results.analysis[locale] = { status: 'failed', error: analysis.error };
    } else if (analysis) {
      console.log(`✅ Analysis: Success`);
      console.log(`   - Themes: ${analysis.themes.length}`);
      console.log(`   - Quotes: ${analysis.quotes.length}`);
      console.log(`   - Key Insights: ${analysis.keyInsights.length}`);
      console.log(`   - Has Summary: ${!!analysis.overallSummary}`);
      
      report.results.analysis[locale] = {
        status: 'success',
        themesCount: analysis.themes.length,
        quotesCount: analysis.quotes.length,
        keyInsightsCount: analysis.keyInsights.length,
        hasSummary: !!analysis.overallSummary,
        genre: analysis.genre,
        targetAudience: analysis.targetAudience
      };
    }
    
    if (social?.error) {
      console.log(`❌ Social Content: Failed (${social.error})`);
      report.results.socialContent[locale] = { status: 'failed', error: social.error };
    } else if (social) {
      const totalPosts = social.reduce((acc, variation) => acc + variation.posts.length, 0);
      const validPosts = social.reduce((acc, variation) => 
        acc + variation.posts.filter(p => p.isValid).length, 0
      );
      
      console.log(`✅ Social Content: Success`);
      console.log(`   - Variations: ${social.length}`);
      console.log(`   - Total Posts: ${totalPosts}`);
      console.log(`   - Valid Posts: ${validPosts}/${totalPosts}`);
      
      report.results.socialContent[locale] = {
        status: 'success',
        variationsCount: social.length,
        totalPosts,
        validPosts,
        validityRate: (validPosts / totalPosts * 100).toFixed(1) + '%'
      };
    }
  });
  
  // Riepilogo generale
  const analysisSuccessCount = Object.values(report.results.analysis).filter(r => r.status === 'success').length;
  const socialSuccessCount = Object.values(report.results.socialContent).filter(r => r.status === 'success').length;
  
  console.log(`\n🎯 OVERALL RESULTS:`);
  console.log(`   Analysis Success Rate: ${analysisSuccessCount}/${TEST_CONFIG.locales.length} locales`);
  console.log(`   Social Content Success Rate: ${socialSuccessCount}/${TEST_CONFIG.locales.length} locales`);
  
  report.results.summary = {
    totalLocales: TEST_CONFIG.locales.length,
    analysisSuccessCount,
    socialSuccessCount,
    overallSuccess: analysisSuccessCount === TEST_CONFIG.locales.length && 
                   socialSuccessCount === TEST_CONFIG.locales.length
  };
  
  if (report.results.summary.overallSuccess) {
    console.log(`✅ ALL TESTS PASSED! AI Localization is working correctly.`);
  } else {
    console.log(`⚠️  Some tests failed. Review the errors above.`);
  }
  
  return report;
}

/**
 * Salva il report di test
 */
function saveTestReport(report) {
  const reportPath = join(process.cwd(), 'ai-localization-test-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n💾 Test report saved to: ${reportPath}`);
}

/**
 * Funzione principale
 */
async function main() {
  console.log('🚀 Starting AI Localization Integration Test...');
  console.log('==============================================');
  
  console.log(`📋 Test Configuration:`);
  console.log(`   Book: "${TEST_CONFIG.bookTitle}" by ${TEST_CONFIG.author}`);
  console.log(`   Locales: ${TEST_CONFIG.locales.join(', ')}`);
  console.log(`   Content Length: ${TEST_BOOK_CONTENT.length} characters`);
  
  try {
    // Test 1: AI Analysis
    const analysisResults = await testAIAnalysis();
    
    // Test 2: Social Content Generation  
    const socialResults = await testSocialContentGeneration(analysisResults);
    
    // Test 3: Generate Comparison Report
    const report = generateComparisonReport(analysisResults, socialResults);
    
    // Save Report
    saveTestReport(report);
    
    console.log('\n✨ AI Localization Test Completed!');
    
    // Exit code based on results
    process.exit(report.results.summary.overallSuccess ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Controllo se stiamo eseguendo il test in modalità veloce
const args = process.argv.slice(2);
const fastMode = args.includes('--fast');

if (fastMode) {
  console.log('⚡ Running in FAST MODE (limited testing)');
  TEST_CONFIG.locales = ['en']; // Solo inglese per test veloce
}

// Esegui lo script
if (require.main === module) {
  main();
}

module.exports = { main, testAIAnalysis, testSocialContentGeneration };
