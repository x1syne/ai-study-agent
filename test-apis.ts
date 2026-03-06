/**
 * Тест новых API источников
 * Запуск: npx ts-node test-apis.ts
 */

async function testStackOverflow() {
  console.log('\n🔷 Testing StackOverflow API...')
  try {
    const response = await fetch(
      'https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=react+hooks&site=stackoverflow&pagesize=2'
    )
    const data = await response.json()
    
    if (data.items && data.items.length > 0) {
      console.log('✅ StackOverflow: OK')
      console.log(`   Found: ${data.items.length} questions`)
      console.log(`   Example: "${data.items[0].title}"`)
      console.log(`   Quota remaining: ${data.quota_remaining}`)
    } else {
      console.log('⚠️ StackOverflow: No results')
    }
  } catch (e) {
    console.log('❌ StackOverflow: Error', e)
  }
}

async function testGitHub() {
  console.log('\n🔷 Testing GitHub API...')
  try {
    const response = await fetch(
      'https://api.github.com/search/repositories?q=react+hooks&sort=stars&per_page=2',
      { headers: { 'User-Agent': 'Test' } }
    )
    const data = await response.json()
    
    if (data.items && data.items.length > 0) {
      console.log('✅ GitHub: OK')
      console.log(`   Found: ${data.total_count} repos`)
      console.log(`   Example: ${data.items[0].full_name} (⭐${data.items[0].stargazers_count})`)
    } else {
      console.log('⚠️ GitHub: No results')
    }
  } catch (e) {
    console.log('❌ GitHub: Error', e)
  }
}

async function testWikidata() {
  console.log('\n🔷 Testing Wikidata API...')
  try {
    const response = await fetch(
      'https://www.wikidata.org/w/api.php?action=wbsearchentities&search=Leonardo%20da%20Vinci&language=ru&limit=2&format=json&origin=*'
    )
    const data = await response.json()
    
    if (data.search && data.search.length > 0) {
      console.log('✅ Wikidata: OK')
      console.log(`   Found: ${data.search.length} entities`)
      console.log(`   Example: ${data.search[0].label} (${data.search[0].id})`)
      console.log(`   Description: ${data.search[0].description}`)
    } else {
      console.log('⚠️ Wikidata: No results')
    }
  } catch (e) {
    console.log('❌ Wikidata: Error', e)
  }
}

async function testMetMuseum() {
  console.log('\n🔷 Testing Met Museum API...')
  try {
    const searchResponse = await fetch(
      'https://collectionapi.metmuseum.org/public/collection/v1/search?q=monet&hasImages=true'
    )
    const searchData = await searchResponse.json()
    
    if (searchData.objectIDs && searchData.objectIDs.length > 0) {
      console.log('✅ Met Museum Search: OK')
      console.log(`   Found: ${searchData.total} artworks`)
      
      // Get details for first artwork
      const detailResponse = await fetch(
        `https://collectionapi.metmuseum.org/public/collection/v1/objects/${searchData.objectIDs[0]}`
      )
      const artwork = await detailResponse.json()
      
      console.log('✅ Met Museum Details: OK')
      console.log(`   Example: "${artwork.title}"`)
      console.log(`   Artist: ${artwork.artistDisplayName || 'Unknown'}`)
      console.log(`   Date: ${artwork.objectDate}`)
    } else {
      console.log('⚠️ Met Museum: No results')
    }
  } catch (e) {
    console.log('❌ Met Museum: Error', e)
  }
}

async function testWikipedia() {
  console.log('\n🔷 Testing Wikipedia API...')
  try {
    const response = await fetch(
      'https://ru.wikipedia.org/w/api.php?action=query&list=search&srsearch=Python&format=json&origin=*'
    )
    const data = await response.json()
    
    if (data.query?.search?.length > 0) {
      console.log('✅ Wikipedia: OK')
      console.log(`   Found: ${data.query.searchinfo.totalhits} articles`)
      console.log(`   Example: "${data.query.search[0].title}"`)
    } else {
      console.log('⚠️ Wikipedia: No results')
    }
  } catch (e) {
    console.log('❌ Wikipedia: Error', e)
  }
}

async function testArxiv() {
  console.log('\n🔷 Testing arXiv API...')
  try {
    const response = await fetch(
      'https://export.arxiv.org/api/query?search_query=all:machine+learning&max_results=2'
    )
    const text = await response.text()
    
    if (text.includes('<entry>')) {
      const titleMatch = text.match(/<title>([^<]+)<\/title>/g)
      console.log('✅ arXiv: OK')
      console.log(`   Found papers`)
      if (titleMatch && titleMatch[1]) {
        console.log(`   Example: ${titleMatch[1].replace(/<\/?title>/g, '').slice(0, 60)}...`)
      }
    } else {
      console.log('⚠️ arXiv: No results')
    }
  } catch (e) {
    console.log('❌ arXiv: Error', e)
  }
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════')
  console.log('        TESTING RAG API SOURCES')
  console.log('═══════════════════════════════════════════════════')
  
  await testWikipedia()
  await testArxiv()
  await testStackOverflow()
  await testGitHub()
  await testWikidata()
  await testMetMuseum()
  
  console.log('\n═══════════════════════════════════════════════════')
  console.log('        TESTS COMPLETE')
  console.log('═══════════════════════════════════════════════════\n')
}

runAllTests()
