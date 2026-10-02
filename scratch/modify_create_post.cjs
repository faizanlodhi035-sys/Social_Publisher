const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, '..', 'src', 'pages', 'CreatePost.tsx');
let content = fs.readFileSync(filepath, 'utf8');

// 1. Imports
content = content.replace(
  /import { postStorage } from "\.\.\/services\/postStorage";\nimport type { PublisherPost, Platform as PostPlatform } from "\.\.\/types\/post";/,
  `import { postStorage } from "../services/postStorage";
import type { PublisherPost, Platform as PostPlatform } from "../types/post";
import { socialApi } from "../services/social/socialApi";
import { publishService } from "../services/publishing/publishService";
import type { ConnectedSocialAccount, SocialPlatform } from "../types/social";`
);

// 2. Remove Platform type
content = content.replace(
  /type Platform = {[\s\S]*?};\n\n/,
  ''
);

// 3. Remove platforms array
content = content.replace(
  /const platforms: Platform\[\] = \[[\s\S]*?\];\n\n/,
  `const CAPTION_LIMITS: Record<SocialPlatform, number> = {
  Instagram: 2200,
  Facebook: 63206,
  TikTok: 4000,
  YouTube: 5000,
};

function getPlatformIcon(platform: SocialPlatform) {
  if (platform === "Instagram") return FaInstagram;
  if (platform === "Facebook") return FaFacebook;
  if (platform === "TikTok") return FaTiktok;
  return FaYoutube;
}

`
);

// 4. Add state for connectedAccounts inside CreatePost
content = content.replace(
  /export default function CreatePost\(\) {\n  const fileInputRef = useRef<HTMLInputElement>\(null\);\n\n  const \[selectedPlatforms, setSelectedPlatforms\] = useState<string\[\]>\(\n    platforms\.map\(\(platform\) => platform\.id\),\n  \);/,
  `export default function CreatePost() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedSocialAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);`
);

// 5. Add useEffect to fetch accounts
content = content.replace(
  /const location = useLocation\(\);\n  const stateImportedRef = useRef\(false\);\n\n  useEffect\(\(\) => {/,
  `const location = useLocation();
  const stateImportedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    socialApi.getConnectedAccounts().then(accs => {
      if (mounted) {
        const connected = accs.filter(a => a.status === 'connected');
        setConnectedAccounts(connected);
        setSelectedPlatforms(connected.map(a => a.id));
        if (connected.length > 0) setActivePreview(connected[0].id);
        setIsLoadingAccounts(false);
      }
    }).catch(() => {
      if (mounted) setIsLoadingAccounts(false);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {`
);

// 6. Fix resetComposer
content = content.replace(
  /setSelectedPlatforms\(platforms\.map\(\(platform\) => platform\.id\)\);\n    setPlatformCaptions\({}\);\n    setScheduleDate\(""\);\n    setScheduleTime\(""\);\n    setShowSchedule\(false\);\n    setActivePreview\("Instagram"\);/,
  `setSelectedPlatforms(connectedAccounts.map((a) => a.id));
    setPlatformCaptions({});
    setScheduleDate("");
    setScheduleTime("");
    setShowSchedule(false);
    setActivePreview(connectedAccounts[0]?.id || "");`
);

// 7. Fix activePlatform calculation
content = content.replace(
  /const activePlatform =\n    platforms\.find\(\(platform\) => platform\.id === activePreview\) \?\?\n    platforms\.find\(\(platform\) => selectedPlatforms\.includes\(platform\.id\)\) \?\?\n    platforms\[0\];/,
  `const activeAccount =
    connectedAccounts.find((account) => account.id === activePreview) ??
    connectedAccounts.find((account) => selectedPlatforms.includes(account.id)) ??
    connectedAccounts[0];`
);

// 8. Fix caption limit logic
content = content.replace(
  /const activeCaption = getCaptionForPlatform\(activePlatform\.id\);\n  const activeCaptionLimit = activePlatform\.captionLimit;/,
  `const activeCaption = activeAccount ? getCaptionForPlatform(activeAccount.id) : "";
  const activeCaptionLimit = activeAccount ? CAPTION_LIMITS[activeAccount.platform] : 2200;`
);

content = content.replace(
  /const hasOverLimitCaption = selectedPlatforms\.some\(\(platformId\) => {\n    const platform = platforms\.find\(\(item\) => item\.id === platformId\);\n    if \(!platform\) return false;\n\n    return getCaptionForPlatform\(platformId\)\.length > platform\.captionLimit;\n  }\);/,
  `const hasOverLimitCaption = selectedPlatforms.some((accountId) => {
    const account = connectedAccounts.find((item) => item.id === accountId);
    if (!account) return false;

    return getCaptionForPlatform(accountId).length > CAPTION_LIMITS[account.platform];
  });`
);

// 9. Fix handlePublish
content = content.replace(
  /const handlePublish = \(\) => {[\s\S]*?resetComposer\(\);\n      showStatus\(message, "success"\);\n    } catch {\n      showStatus\(\n        "Post could not be saved\. Please try again\.",\n        "error",\n      \);\n    }\n  }, 900\);\n};/,
  `const handlePublish = async () => {
    if (!selectedCount) {
      showStatus("Select at least one account.", "error");
      return;
    }
    if (!mediaItems.length) {
      showStatus("Add at least one media file before publishing.", "error");
      return;
    }
    if (!caption.trim()) {
      showStatus("Add a caption before publishing.", "error");
      return;
    }
    if (hasOverLimitCaption) {
      showStatus("One or more platform captions exceed their limits.", "error");
      return;
    }
    if (!isScheduleValid()) {
      showStatus("Choose a future date and time for the scheduled post.", "error");
      return;
    }

    setIsPublishing(true);
    setStatusMessage("");

    try {
      const selectedAccountDetails = connectedAccounts.filter((account) =>
        selectedPlatforms.includes(account.id),
      );

      for (const account of selectedAccountDetails) {
        await publishService.publishPost({
          accountId: account.id,
          caption: getCaptionForPlatform(account.id),
          mediaIds: mediaItems.map(m => m.id),
          scheduleDate: showSchedule ? scheduleDate : undefined,
          scheduleTime: showSchedule ? scheduleTime : undefined,
        });
      }

      const message = showSchedule ? "Post scheduled successfully via API." : "Post published successfully via API.";
      resetComposer();
      showStatus(message, "success");
    } catch (err) {
      showStatus(err instanceof Error ? err.message : "Failed to publish post.", "error");
    } finally {
      setIsPublishing(false);
    }
  };`
);

// 10. Fix drafts logic
content = content.replace(
  /const selectedPlatformDetails = platforms\.filter\(\(platform\) =>\n          selectedPlatforms\.includes\(platform\.id\),\n        \);\n\n        const newDrafts: PublisherPost\[\] = selectedPlatformDetails\.map\(\(platform\) => {\n          const platformCaption = getCaptionForPlatform\(platform\.id\);/,
  `const selectedAccountDetails = connectedAccounts.filter((account) =>
          selectedPlatforms.includes(account.id),
        );

        const newDrafts: PublisherPost[] = selectedAccountDetails.map((account) => {
          const platformCaption = getCaptionForPlatform(account.id);`
);

content = content.replace(
  /platform: platform\.id as PostPlatform,/g,
  `platform: account.platform as PostPlatform,`
);

content = content.replace(
  /id: \`draft-\$\{Date\.now\(\)\}-\$\{platform\.id\}\`,/g,
  `id: \`draft-\${Date.now()}-\${account.id}\`,`
);


// 11. Fix the top UI empty state
content = content.replace(
  /<div className="mx-auto max-w-\[1400px\] pb-6">/,
  `<div className="mx-auto max-w-[1400px] pb-6">
      {isLoadingAccounts ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : connectedAccounts.length === 0 ? (
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
            <Link2 size={32} />
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-900">No Connected Accounts</h2>
          <p className="mt-2 text-slate-500">You need to connect at least one social media account to create a post.</p>
          <a href="/accounts" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 transition">
            Go to Accounts
          </a>
        </div>
      ) : (`
);

content = content.replace(
  /<\/div>\n    <\/div>\n  \);\n}/,
  `</div>
    </div>
      )}
    </div>
  );
}`
);

// 12. Fix the account selector map
content = content.replace(
  /platforms\.map\(\(platform\) => {\n[\s\S]*?const isSelected = selectedPlatforms\.includes\(platform\.id\);\n[\s\S]*?const Icon = platform\.icon;/,
  `connectedAccounts.map((account) => {
                  const isSelected = selectedPlatforms.includes(account.id);
                  const Icon = getPlatformIcon(account.platform);`
);

content = content.replace(
  /key={platform\.id}/g,
  `key={account.id}`
);
content = content.replace(
  /onClick={\(\) => togglePlatform\(platform\.id\)}/g,
  `onClick={() => togglePlatform(account.id)}`
);
content = content.replace(
  /<p className="text-sm font-semibold text-slate-900">\n\s*\{platform\.name\}\n\s*<\/p>/g,
  `<p className="text-sm font-semibold text-slate-900">
                            {account.displayName}
                          </p>`
);
content = content.replace(
  /<p className="text-xs text-slate-500">\n\s*\{platform\.username\}\n\s*<\/p>/g,
  `<p className="text-xs text-slate-500">
                            {account.username}
                          </p>`
);
content = content.replace(
  /const captionPlatform = platforms\.find\(\(p\) => p\.id === platformId\);/,
  `const captionPlatform = connectedAccounts.find((a) => a.id === platformId);`
);
content = content.replace(
  /if \(!captionPlatform\) return null;\n\n                    const Icon = captionPlatform\.icon;/,
  `if (!captionPlatform) return null;

                    const Icon = getPlatformIcon(captionPlatform.platform);`
);
content = content.replace(
  /\{captionPlatform\.name\}/g,
  `{captionPlatform.platform}`
);
content = content.replace(
  /placeholder={\`Write a specific caption for \$\{captionPlatform\.name\}\.\.\.\`}/g,
  `placeholder={\`Write a specific caption for \${captionPlatform.displayName}...\`}`
);

// Preview panel
content = content.replace(
  /const previewPlatform = platforms\.find\(\(p\) => p\.id === activePreview\);/,
  `const previewPlatform = connectedAccounts.find((p) => p.id === activePreview);`
);
content = content.replace(
  /const PreviewIcon = previewPlatform\?\.icon \?\? FaInstagram;/,
  `const PreviewIcon = previewPlatform ? getPlatformIcon(previewPlatform.platform) : FaInstagram;`
);
content = content.replace(
  /\{previewPlatform\?\.name \?\? "Instagram"\}/g,
  `{previewPlatform?.platform ?? "Instagram"}`
);
content = content.replace(
  /\{previewPlatform\?\.username \?\? "@creator_rb"\}/g,
  `{previewPlatform?.username ?? "@creator_rb"}`
);

fs.writeFileSync(filepath, content, 'utf8');
console.log('Modifications applied.');
