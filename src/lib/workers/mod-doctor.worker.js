import { analyzeModDoctorRecords } from "../utils/modDoctor.js";

self.onmessage = (event) => {
	const payload = event?.data;
	if (!payload || payload.type !== "analyze") {
		return;
	}

	try {
		self.postMessage({
			type: "status",
			message: `Analyzing ${payload.records?.length || 0} file${payload.records?.length === 1 ? "" : "s"}...`,
		});
		const analysis = analyzeModDoctorRecords(payload.records || []);
		self.postMessage({
			type: "result",
			analysis,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unable to analyze the uploaded files in this browser worker.";
		self.postMessage({
			type: "error",
			message,
		});
	}
};
