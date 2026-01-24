import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Aggressive style sanitizer for html2canvas.
 * Modern browsers/Tailwind v4 use oklab/oklch/lab color functions which html2canvas crashes on.
 * We iterate through all elements and styles to strip these before capture.
 */
export async function exportReportToPDF(elementId: string, filename: string) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error("Export element not found");
        return;
    }

    try {
        // Hide UI elements that shouldn't be in the PDF
        const nav = element.querySelector("nav");
        const actions = document.querySelector("header .flex.items-center.gap-4");
        if (nav) (nav as HTMLElement).style.display = "none";
        if (actions) (actions as HTMLElement).style.display = "none";

        // Set height to auto to ensure the full report is captured
        const originalHeight = element.style.height;
        element.style.height = "auto";

        const canvas = await html2canvas(element, {
            scale: 1, // High reliability over resolution
            useCORS: true,
            backgroundColor: "#000000",
            logging: false, // Set to true for debugging if needed
            onclone: (clonedDoc) => {
                const clonedElement = clonedDoc.getElementById(elementId);
                if (!clonedElement) return;

                // Ensure solid background for the cloned root
                clonedElement.style.background = "#000000";

                const allElements = clonedElement.querySelectorAll('*');
                allElements.forEach((el: any) => {
                    // Robust class name check handling both HTML and SVG elements
                    const className = typeof el.className === 'string'
                        ? el.className
                        : (el.className?.baseVal || "");

                    // Reset problematic visual effects
                    el.style.boxShadow = "none";
                    el.style.textShadow = "none";
                    el.style.backdropFilter = "none";
                    el.style.transition = "none";
                    el.style.animation = "none";

                    // Force solid card backgrounds
                    if (className.includes('bg-zinc') || className.includes('bg-white/')) {
                        el.style.backgroundColor = "#18181b";
                    }

                    // Force standard text colors
                    if (className.includes('text-zinc')) {
                        el.style.color = "#a1a1aa";
                    }
                    if (className.includes('text-brand')) {
                        el.style.color = "#ff595a";
                    }

                    // DEEP STYLE SCRUBBER
                    // Iterate through all CSS properties to find anything mentioning lab() or okl()
                    // This catches shorthands like 'border', 'outline', etc.
                    const style = window.getComputedStyle(el);
                    for (let i = 0; i < style.length; i++) {
                        const prop = style[i];
                        const val = style.getPropertyValue(prop);
                        if (val.includes('okl') || val.includes('lab(')) {
                            // Force a safe fallback for color properties
                            if (prop.toLowerCase().includes('color') || prop === 'fill' || prop === 'stroke') {
                                el.style.setProperty(prop, "#ffffff", "important");
                            } else {
                                el.style.setProperty(prop, "unset", "important");
                            }
                        }
                    }
                });
            }
        });

        // Restore original UI state
        if (nav) (nav as HTMLElement).style.display = "flex";
        if (actions) (actions as HTMLElement).style.display = "flex";
        element.style.height = originalHeight;

        // Generate and save PDF
        const imgData = canvas.toDataURL("image/jpeg", 0.9);
        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "px",
            format: [canvas.width, canvas.height],
        });

        pdf.addImage(imgData, "JPEG", 0, 0, canvas.width, canvas.height);
        pdf.save(`${filename}.pdf`);
    } catch (error) {
        console.error("PDF Export Error:", error);
        alert("The automated PDF capture encountered a modern CSS color error (lab/oklab). \n\nFIXING: I have updated the sanitizer. If it still fails, please use Cmd+P and 'Save as PDF' while I investigate further.");
    }
}
