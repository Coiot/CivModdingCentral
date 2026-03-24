export const RELEASES_REPO_URL = "https://github.com/Coiot/cmc-workshop-uploader";
export const CURRENT_VERSION = "1.1.6";
export const RELEASE_TAG = `v${CURRENT_VERSION}`;
export const RELEASE_PAGE_URL = `${RELEASES_REPO_URL}/releases/tag/${RELEASE_TAG}`;

// Optional: set exact asset filenames from the GitHub release to enable direct one-click downloads.
// If left blank, cards link to the release page (or stay "Coming soon" for unavailable platforms).
export const RELEASE_ASSET_FILENAMES = {
	macos: "",
	linux: "",
	windows: "",
};

export const resolveReleaseLink = (assetFileName) => (assetFileName ? `${RELEASES_REPO_URL}/releases/download/${RELEASE_TAG}/${assetFileName}` : RELEASE_PAGE_URL);

export const macOsAvailable = true;
export const linuxAvailable = Boolean(RELEASE_ASSET_FILENAMES.linux);
export const windowsAvailable = Boolean(RELEASE_ASSET_FILENAMES.windows);

export const workshopUploaderDownloadCards = [
	{
		id: "macos",
		title: "macOS",
		formats: "DMG",
		status: "Available now",
		copy: `The current stable release is the macOS build. Version ${CURRENT_VERSION} is the latest macOS uploader.`,
		actionLabel: "Download macOS Build",
		href: resolveReleaseLink(RELEASE_ASSET_FILENAMES.macos),
		available: macOsAvailable,
	},
	{
		id: "linux",
		title: "Linux",
		formats: "AI / DEB / TAR.GZ",
		status: linuxAvailable ? "Available now" : "Coming soon",
		copy: linuxAvailable ? `Version ${CURRENT_VERSION} is available on the GitHub release page.` : "Linux version is currently being tested and is not ready to ship yet.",
		actionLabel: linuxAvailable ? "Download Linux Build" : "Coming Soon",
		href: resolveReleaseLink(RELEASE_ASSET_FILENAMES.linux),
		available: linuxAvailable,
	},
	{
		id: "windows",
		title: "Windows",
		formats: "EXE",
		status: windowsAvailable ? "Available now" : "Coming soon",
		copy: windowsAvailable ? `Version ${CURRENT_VERSION} is available on the GitHub release page.` : "Windows version is currently being tested and is not ready to ship yet.",
		actionLabel: windowsAvailable ? "Download Windows Build" : "Coming Soon",
		href: resolveReleaseLink(RELEASE_ASSET_FILENAMES.windows),
		available: windowsAvailable,
	},
];
