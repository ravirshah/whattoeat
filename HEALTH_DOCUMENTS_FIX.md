# Health Documents Fix - PDF Extraction & Index Errors

## Issues Fixed

### 1. Firebase Index Missing Error
**Error**: `The query requires an index. You can create it here: https://console.firebase.google.com/...`

**Fix**: Added composite indexes for health documents in `firestore.indexes.json`:
- `healthDocuments` with `userId` + `uploadedAt` 
- `healthDocuments` with `userId` + `isActive` + `uploadedAt`

### 2. PDF Text Extraction Error  
**Error**: `SyntaxError: The string did not match the expected pattern`

**Fixes**:
- ✅ Added `pdf-parse` library for proper PDF text extraction
- ✅ Created `/api/extract-pdf-text` endpoint for server-side PDF processing
- ✅ Fixed FormData handling issues
- ✅ Enhanced error handling and debugging
- ✅ Improved Firebase auth imports

### 3. Document Persistence
**Fix**: Enhanced Firestore rules and error handling to ensure health documents are properly saved and retrievable.

## Required Actions

### 1. Deploy Firebase Indexes (CRITICAL)

**Option A: Automatic (Recommended)**
1. Try uploading a health document
2. When you see the index error, click the provided link
3. Firebase will create the required indexes automatically

**Option B: Manual via Firebase Console**
1. Go to [Firebase Console](https://console.firebase.google.com/project/what-to-eat-45e6b/firestore/indexes)
2. Create these composite indexes:

**Index 1:**
- Collection: `healthDocuments`
- Fields: 
  - `userId` (Ascending)
  - `uploadedAt` (Descending)

**Index 2:**
- Collection: `healthDocuments`  
- Fields:
  - `userId` (Ascending)
  - `isActive` (Ascending) 
  - `uploadedAt` (Descending)

**Option C: Firebase CLI (if installed)**
```bash
cd whattoeat/whattoeat
firebase deploy --only firestore:indexes
```

### 2. Deploy Firestore Rules (if needed)

The rules in `FIRESTORE_RULES.txt` already include health documents. If you haven't deployed them recently:

1. Go to [Firebase Console](https://console.firebase.google.com/project/what-to-eat-45e6b/firestore/rules)
2. Copy the content from `FIRESTORE_RULES.txt`
3. Replace existing rules and click "Publish"

### 3. Test PDF Upload

After deploying indexes:
1. Go to Profile → Health Documents
2. Upload your `completed-lab-result-2025-04-22.pdf`
3. Should see successful text extraction and AI analysis
4. Check browser console for detailed logs

## What Changed

### New API Endpoint
- `/api/extract-pdf-text` - Properly extracts text from PDF files using pdf-parse library

### Enhanced Health Document Processing
- Better AI prompts for medical lab reports
- Improved error handling and debugging
- Fixed FormData and Firebase auth issues

### Firebase Configuration
- Added required composite indexes
- Enhanced security rules (already in place)

## Expected Results

After deploying indexes, you should see:

```
✅ Successfully extracted 1234 characters from PDF
✅ AI analysis result: { parsedData: {...}, aiSummary: "..." }
✅ Health document uploaded and processed successfully!
```

Instead of:
```
❌ Error getting health documents: FirebaseError: The query requires an index
❌ PDF extraction error: SyntaxError: The string did not match expected pattern
```

## Troubleshooting

**If index errors persist:**
- Wait 5-10 minutes after creating indexes (they need time to build)
- Check Firebase Console → Firestore → Indexes for status

**If PDF extraction fails:**
- Check if PDF is password-protected or scanned (image-based)
- Look at browser console for detailed error messages
- Try with a different PDF file to test

**If documents don't save:**
- Verify Firestore rules are deployed
- Check browser console for permission errors
- Ensure user is properly authenticated

## Benefits

1. **Proper PDF Parsing**: Blood panels and lab reports are now correctly parsed
2. **Smart Health Analysis**: AI can extract cholesterol, glucose, vitamin levels, etc.
3. **Goal Integration**: Health data can be used for smart goal suggestions
4. **Reliable Storage**: Documents are properly saved and retrievable
5. **Better UX**: Clear error messages and progress feedback 