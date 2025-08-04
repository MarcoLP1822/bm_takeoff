#!/usr/bin/env tsx
/**
 * Script per rimuovere file e contenuti obsoleti dalla codebase
 * Eseguire con: npx tsx scripts/cleanup-obsolete-files.ts
 */

import fs from 'fs/promises'
import path from 'path'

const ROOT_DIR = process.cwd()

// File da rimuovere completamente
const OBSOLETE_FILES = [
  'CLEANUP_REPORT.md',
  'FASE_2_1_COMPLETATA.md', 
  'docs/fase-2-1-completion-report.md',
  'scripts/cleanup-migration.js',
  'scripts/migrate-api-endpoints.js',
  'fix-tests.sh',
  'fix-api-params.sh'
]

// Pattern di file da rimuovere
const OBSOLETE_PATTERNS = [
  '.next/cache/**/*.old',
  'supabase/.temp/**/*',
  '**/*.tmp',
  '**/*.temp',
  '**/*.bak'
]

// Directory da archiviare
const ARCHIVE_FILES = [
  'PIANO_DI_LAVORO.md'
]

async function removeObsoleteFiles() {
  console.log('🧹 Rimozione file obsoleti...\n')
  
  let removedCount = 0
  
  for (const file of OBSOLETE_FILES) {
    const filePath = path.join(ROOT_DIR, file)
    
    try {
      await fs.access(filePath)
      await fs.unlink(filePath)
      console.log(`✅ Rimosso: ${file}`)
      removedCount++
    } catch (error) {
      console.log(`⚠️  File non trovato: ${file}`)
    }
  }
  
  return removedCount
}

async function createArchiveDirectory() {
  const archiveDir = path.join(ROOT_DIR, 'docs/archive')
  
  try {
    await fs.mkdir(archiveDir, { recursive: true })
    console.log(`📁 Creata directory: docs/archive/`)
  } catch (error) {
    console.log(`⚠️  Errore creazione archive: ${error}`)
  }
}

async function archiveFiles() {
  console.log('\n📦 Archiviazione file di riferimento...\n')
  
  await createArchiveDirectory()
  let archivedCount = 0
  
  for (const file of ARCHIVE_FILES) {
    const sourcePath = path.join(ROOT_DIR, file)
    const fileName = path.basename(file)
    const archivePath = path.join(ROOT_DIR, 'docs/archive', fileName)
    
    try {
      await fs.access(sourcePath)
      await fs.copyFile(sourcePath, archivePath)
      await fs.unlink(sourcePath)
      console.log(`📦 Archiviato: ${file} → docs/archive/${fileName}`)
      archivedCount++
    } catch (error) {
      console.log(`⚠️  File non trovato per archiviazione: ${file}`)
    }
  }
  
  return archivedCount
}

async function cleanupCache() {
  console.log('\n🗑️  Pulizia cache...\n')
  
  const cacheFiles = [
    '.next/cache',
    'tsconfig.tsbuildinfo'
  ]
  
  let cleanedCount = 0
  
  for (const cacheItem of cacheFiles) {
    const cachePath = path.join(ROOT_DIR, cacheItem)
    
    try {
      const stat = await fs.stat(cachePath)
      
      if (stat.isDirectory()) {
        await fs.rm(cachePath, { recursive: true, force: true })
        console.log(`🗑️  Rimossa directory cache: ${cacheItem}`)
      } else {
        await fs.unlink(cachePath)
        console.log(`🗑️  Rimosso file cache: ${cacheItem}`)
      }
      
      cleanedCount++
    } catch (error) {
      console.log(`⚠️  Cache non trovata: ${cacheItem}`)
    }
  }
  
  return cleanedCount
}

async function updateGitignore() {
  console.log('\n📝 Aggiornamento .gitignore...\n')
  
  const gitignorePath = path.join(ROOT_DIR, '.gitignore')
  
  const additionalIgnores = [
    '',
    '# Cleanup script generated',
    '*.tmp',
    '*.temp', 
    '*.bak',
    '*.old',
    '.temp/',
    'docs/archive/',
  ]
  
  try {
    const existingContent = await fs.readFile(gitignorePath, 'utf-8')
    
    // Verifica se le regole sono già presenti
    const hasCleanupSection = existingContent.includes('# Cleanup script generated')
    
    if (!hasCleanupSection) {
      const updatedContent = existingContent + '\n' + additionalIgnores.join('\n') + '\n'
      await fs.writeFile(gitignorePath, updatedContent)
      console.log('✅ .gitignore aggiornato con regole di pulizia')
    } else {
      console.log('⚠️  .gitignore già aggiornato')
    }
  } catch (error) {
    console.log(`❌ Errore aggiornamento .gitignore: ${error}`)
  }
}

async function generateCleanupReport() {
  const reportPath = path.join(ROOT_DIR, 'docs/archive/cleanup-summary.md')
  
  const report = `# 🧹 Cleanup Report - ${new Date().toISOString().split('T')[0]}

## File Rimossi
${OBSOLETE_FILES.map(f => `- ${f}`).join('\n')}

## File Archiviati  
${ARCHIVE_FILES.map(f => `- ${f} → docs/archive/${path.basename(f)}`).join('\n')}

## Cache Pulita
- .next/cache/
- tsconfig.tsbuildinfo

## Note
- Tutti i file obsoleti sono stati rimossi in sicurezza
- I file di documentazione importante sono stati archiviati
- La cache è stata pulita e sarà rigenerata al prossimo build

## Raccomandazioni Post-Cleanup
1. Eseguire \`npm run build\` per verificare che tutto funzioni
2. Eseguire \`npm run test\` per confermare che i test passino
3. Rivedere i componenti in \`components/utility/\` per consolidamento
4. Considerare la centralizzazione dei link hardcoded
`

  try {
    await fs.writeFile(reportPath, report)
    console.log('📄 Report di cleanup generato in: docs/archive/cleanup-summary.md')
  } catch (error) {
    console.log(`❌ Errore generazione report: ${error}`)
  }
}

async function main() {
  console.log('🚀 Avvio pulizia codebase...\n')
  
  try {
    const removedCount = await removeObsoleteFiles()
    const archivedCount = await archiveFiles()
    const cleanedCount = await cleanupCache()
    await updateGitignore()
    await generateCleanupReport()
    
    console.log('\n✨ Pulizia completata!')
    console.log(`📊 Statistiche:`)
    console.log(`   - File rimossi: ${removedCount}`)
    console.log(`   - File archiviati: ${archivedCount}`)
    console.log(`   - Cache pulita: ${cleanedCount}`)
    console.log('\n🎯 Prossimi passi:')
    console.log('   1. npm run build')
    console.log('   2. npm run test')
    console.log('   3. git add . && git commit -m "🧹 cleanup: remove obsolete files"')
    
  } catch (error) {
    console.error('❌ Errore durante la pulizia:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
