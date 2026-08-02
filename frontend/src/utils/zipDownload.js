import JSZip from 'jszip';

/**
 * Downloads generated project files as a ZIP archive
 * @param {Array<{path: string, content: string}>} files - List of file objects
 * @param {string} projectName - Name of the project archive
 * @param {string} [projectId] - Optional backend project ID
 */
export async function downloadProjectZip(files = [], projectName = 'student-management-api', projectId = null) {
  try {
    const cleanName = (projectName || 'generated-api')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'api-repository';
    const filename = cleanName.endsWith('.zip') ? cleanName : `${cleanName}.zip`;

    if (files && files.length > 0) {
      const zip = new JSZip();

      files.forEach((file) => {
        if (file && file.path) {
          const filePath = file.path.replace(/^[\/\\]+/, '');
          zip.file(filePath, file.content || '');
        }
      });

      // Inject manifest.json if not present
      if (!files.some(f => f.path === 'manifest.json')) {
        zip.file('manifest.json', JSON.stringify({
          name: cleanName,
          totalFiles: files.length,
          generatedAt: new Date().toISOString(),
          generator: 'OpenAPI AI REST Studio'
        }, null, 2));
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return;
    }

    // Fallback to backend download route
    const downloadUrl = `/api/generator/download/${projectId || 'latest'}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Failed to generate client ZIP, attempting backend route...', err);
    window.location.href = `/api/generator/download/${projectId || 'latest'}`;
  }
}
