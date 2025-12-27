#!/usr/bin/env node

/**
 * Instagram画像自動収集スクリプト
 *
 * 環境変数:
 *   - IG_BUSINESS_ID: Instagram Business Account ID
 *   - IG_ACCESS_TOKEN: Instagram Graph API Access Token
 *   - FB_APP_ID: Facebook App ID
 *   - FB_APP_SECRET: Facebook App Secret
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数の取得
const IG_BUSINESS_ID = process.env.IG_BUSINESS_ID;
const IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN;
const FB_APP_ID = process.env.FB_APP_ID;
const FB_APP_SECRET = process.env.FB_APP_SECRET;

// 画像保存先ディレクトリ
const IMAGE_DIR = path.join(__dirname, '../public/images/instagram');
const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

/**
 * 必須環境変数のチェック
 */
function validateEnvVars() {
  const missing = [];

  if (!IG_BUSINESS_ID) missing.push('IG_BUSINESS_ID');
  if (!IG_ACCESS_TOKEN) missing.push('IG_ACCESS_TOKEN');
  if (!FB_APP_ID) missing.push('FB_APP_ID');
  if (!FB_APP_SECRET) missing.push('FB_APP_SECRET');

  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log('✓ All required environment variables are set');
}

/**
 * アクセストークンのデバッグ情報を取得
 */
async function getTokenInfo(accessToken) {
  try {
    const url = `${GRAPH_API_BASE}/debug_token?input_token=${accessToken}&access_token=${FB_APP_ID}|${FB_APP_SECRET}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to get token info: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('❌ Error getting token info:', error.message);
    throw error;
  }
}

/**
 * アクセストークンの有効性チェックと延長
 */
async function checkAndRefreshToken() {
  console.log('\n--- Token Validation ---');

  try {
    const tokenInfo = await getTokenInfo(IG_ACCESS_TOKEN);

    console.log(`Token Type: ${tokenInfo.type}`);
    console.log(`App ID: ${tokenInfo.app_id}`);
    console.log(`Is Valid: ${tokenInfo.is_valid}`);

    if (!tokenInfo.is_valid) {
      console.error('❌ Access token is invalid');
      process.exit(1);
    }

    // 有効期限のチェック (data_access_expires_at)
    if (tokenInfo.data_access_expires_at) {
      const expiresAt = new Date(tokenInfo.data_access_expires_at * 1000);
      const now = new Date();
      const daysUntilExpiry = Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24));

      console.log(`Data Access Expires At: ${expiresAt.toISOString()}`);
      console.log(`Days Until Expiry: ${daysUntilExpiry}`);

      // 30日以内に期限切れの場合は警告
      if (daysUntilExpiry < 30) {
        console.warn(`⚠️  WARNING: Token will expire in ${daysUntilExpiry} days`);
      }

      // 7日以内に期限切れの場合はトークンの延長を試みる
      if (daysUntilExpiry < 7) {
        console.log('Attempting to refresh token...');
        const newToken = await refreshLongLivedToken();
        if (newToken) {
          console.log('✓ Token refreshed successfully');
          console.log('⚠️  Please update IG_ACCESS_TOKEN secret with the new token:');
          console.log(newToken);
          return newToken;
        }
      }
    }

    // expires_at のチェック (短期トークンの場合)
    if (tokenInfo.expires_at) {
      const expiresAt = new Date(tokenInfo.expires_at * 1000);
      const now = new Date();
      const hoursUntilExpiry = Math.floor((expiresAt - now) / (1000 * 60 * 60));

      console.log(`Token Expires At: ${expiresAt.toISOString()}`);
      console.log(`Hours Until Expiry: ${hoursUntilExpiry}`);

      if (hoursUntilExpiry < 24) {
        console.warn(`⚠️  WARNING: Short-lived token will expire in ${hoursUntilExpiry} hours`);
      }
    }

    console.log('✓ Token is valid');
    return IG_ACCESS_TOKEN;

  } catch (error) {
    console.error('❌ Token validation failed:', error.message);
    process.exit(1);
  }
}

/**
 * 長期トークンの延長
 */
async function refreshLongLivedToken() {
  try {
    const url = `${GRAPH_API_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}&fb_exchange_token=${IG_ACCESS_TOKEN}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Token refresh failed:', errorData);
      return null;
    }

    const data = await response.json();
    return data.access_token;

  } catch (error) {
    console.error('Error refreshing token:', error.message);
    return null;
  }
}

/**
 * Instagramメディアの取得
 */
async function fetchInstagramMedia(accessToken) {
  console.log('\n--- Fetching Instagram Media ---');

  try {
    // 最新の投稿を取得 (IMAGE, CAROUSEL_ALBUMのみ)
    const fields = 'id,media_type,media_url,thumbnail_url,permalink,timestamp';
    const url = `${GRAPH_API_BASE}/${IG_BUSINESS_ID}/media?fields=${fields}&limit=20&access_token=${accessToken}`;

    console.log('Fetching media from Instagram...');
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      console.warn('⚠️  No media found');
      return [];
    }

    // IMAGEまたはCAROUSEL_ALBUMのみをフィルタリング
    const imageMedia = data.data.filter(item =>
      item.media_type === 'IMAGE' || item.media_type === 'CAROUSEL_ALBUM'
    );

    console.log(`Found ${imageMedia.length} image posts (filtered from ${data.data.length} total)`);

    // CAROUSEL_ALBUMの場合、子要素の画像を取得
    const mediaWithImages = [];
    for (const item of imageMedia) {
      if (item.media_type === 'CAROUSEL_ALBUM') {
        // カルーセルの最初の画像を取得
        const childrenUrl = `${GRAPH_API_BASE}/${item.id}/children?fields=media_url,media_type&access_token=${accessToken}`;
        const childrenResponse = await fetch(childrenUrl);
        const childrenData = await childrenResponse.json();

        if (childrenData.data && childrenData.data.length > 0) {
          const firstImage = childrenData.data.find(child => child.media_type === 'IMAGE');
          if (firstImage) {
            mediaWithImages.push({
              ...item,
              media_url: firstImage.media_url
            });
          }
        }
      } else {
        mediaWithImages.push(item);
      }

      // 9件取得したら終了
      if (mediaWithImages.length >= 9) {
        break;
      }
    }

    return mediaWithImages.slice(0, 9);

  } catch (error) {
    console.error('❌ Error fetching Instagram media:', error.message);
    throw error;
  }
}

/**
 * 画像のダウンロード
 */
async function downloadImage(url, filePath) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    fs.writeFileSync(filePath, buffer);

  } catch (error) {
    console.error(`❌ Error downloading image from ${url}:`, error.message);
    throw error;
  }
}

/**
 * 画像の保存
 */
async function saveImages(mediaList) {
  console.log('\n--- Saving Images ---');

  // ディレクトリが存在しない場合は作成
  if (!fs.existsSync(IMAGE_DIR)) {
    console.log(`Creating directory: ${IMAGE_DIR}`);
    fs.mkdirSync(IMAGE_DIR, { recursive: true });
  }

  // 画像を01.jpg〜09.jpgとして保存
  for (let i = 0; i < mediaList.length; i++) {
    const media = mediaList[i];
    const fileName = `${String(i + 1).padStart(2, '0')}.jpg`;
    const filePath = path.join(IMAGE_DIR, fileName);

    console.log(`Downloading ${fileName}...`);
    await downloadImage(media.media_url, filePath);
    console.log(`✓ Saved: ${fileName}`);
  }

  console.log(`\n✓ Successfully saved ${mediaList.length} images`);
}

/**
 * メイン処理
 */
async function main() {
  console.log('=== Instagram Image Fetcher ===\n');

  try {
    // 1. 環境変数のチェック
    validateEnvVars();

    // 2. トークンの有効性チェックと延長
    const accessToken = await checkAndRefreshToken();

    // 3. Instagramメディアの取得
    const mediaList = await fetchInstagramMedia(accessToken);

    if (mediaList.length === 0) {
      console.warn('⚠️  No images to save');
      process.exit(0);
    }

    // 4. 画像の保存
    await saveImages(mediaList);

    console.log('\n✓ All tasks completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// スクリプト実行
main();
