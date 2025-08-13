import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
export async function exportToPDF(id, name='ficha.pdf'){
  const el = document.getElementById(id); if(!el) return;
  const canvas = await html2canvas(el,{scale:2,useCORS:true});
  const pdf = new jsPDF('p','mm','a4');
  const pageW = 210, pageH = 297;
  const ratio = Math.min(pageW/canvas.width, pageH/canvas.height);
  const w = canvas.width*ratio, h = canvas.height*ratio;
  pdf.addImage(canvas.toDataURL('image/png'),'PNG',(pageW-w)/2,5,w,h-10);
  pdf.save(name);
}
