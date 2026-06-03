import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

// Generate PDF for a single assessment
export async function generateAssessmentPDF(assessment) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20

  // Header
  doc.setFillColor(26, 35, 50)
  doc.rect(0, 0, pageWidth, 40, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Flood Damage Assessment', 20, 20)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Madison County, NC — Ceres Field Operations', 20, 30)

  y = 55

  // Assessment ID + Date
  doc.setTextColor(100, 100, 100)
  doc.setFontSize(9)
  doc.text(`Assessment ID: ${assessment.clientId || assessment.id}`, 20, y)
  doc.text(
    `Date: ${new Date(assessment.createdAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    })}`,
    pageWidth - 20,
    y,
    { align: 'right' }
  )

  y += 12

  // Condition Badge
  const condColor = {
    Good: [34, 197, 94],
    Moderate: [245, 158, 11],
    Bad: [239, 68, 68]
  }
  const color = condColor[assessment.condition] || [100, 100, 100]
  doc.setFillColor(...color)
  doc.roundedRect(20, y, 40, 10, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(assessment.condition || 'Unknown', 40, y + 7, { align: 'center' })

  y += 20

  // Section: Farm Details
  doc.setTextColor(26, 35, 50)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Farm Details', 20, y)
  y += 2
  doc.setDrawColor(200, 200, 200)
  doc.line(20, y, pageWidth - 20, y)
  y += 8

  const details = [
    ['Assessor Name', assessment.assessorName],
    ['Address', assessment.address],
    ['Latitude', assessment.latitude?.toString()],
    ['Longitude', assessment.longitude?.toString()],
    ['Chicken Count', parseInt(assessment.chickenCount || 0).toLocaleString()],
    ['Synced At', new Date(assessment.syncedAt).toLocaleString()]
  ]

  doc.setFontSize(10)
  details.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80, 80, 80)
    doc.text(`${label}:`, 20, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(26, 35, 50)
    const lines = doc.splitTextToSize(value || 'N/A', pageWidth - 80)
    doc.text(lines, 80, y)
    y += lines.length * 7 + 2
  })

  y += 5

  // Section: Field Notes
  if (assessment.notes) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(26, 35, 50)
    doc.text('Field Notes', 20, y)
    y += 2
    doc.line(20, y, pageWidth - 20, y)
    y += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(50, 50, 50)
    const noteLines = doc.splitTextToSize(assessment.notes, pageWidth - 40)
    doc.text(noteLines, 20, y)
    y += noteLines.length * 7 + 10
  }

  // Section: Photos
  if (assessment.photos && assessment.photos.length > 0) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(26, 35, 50)
    doc.text('Site Photos', 20, y)
    y += 2
    doc.line(20, y, pageWidth - 20, y)
    y += 8

    for (const photo of assessment.photos) {
      try {
        // Add photo from Cloudinary URL
        const imgData = await loadImageAsBase64(photo.cloudinaryUrl)
        if (imgData) {
          if (y > 220) {
            doc.addPage()
            y = 20
          }
          doc.addImage(imgData, 'JPEG', 20, y, 80, 60)
          doc.setFontSize(8)
          doc.setTextColor(100, 100, 100)
          doc.text(photo.filename || 'Photo', 20, y + 65)
          y += 75
        }
      } catch {
        console.warn('Could not load photo:', photo.cloudinaryUrl)
      }
    }
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Page ${i} of ${pageCount} — Ceres Flood Assessment — Madison County, NC`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }

  doc.save(`assessment-${assessment.id}-${new Date().toISOString().split('T')[0]}.pdf`)
}

// Generate full report for all assessments
export async function generateFullReport(assessments) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20

  // Cover Page
  doc.setFillColor(26, 35, 50)
  doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('Flood Damage Assessment', pageWidth / 2, 80, { align: 'center' })
  doc.text('Full Report', pageWidth / 2, 95, { align: 'center' })

  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text('Madison County, NC', pageWidth / 2, 115, { align: 'center' })
  doc.text('Ceres Field Operations', pageWidth / 2, 125, { align: 'center' })

  doc.setFontSize(11)
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    })}`,
    pageWidth / 2,
    145,
    { align: 'center' }
  )

  doc.setFontSize(11)
  doc.text(
    `Total Assessments: ${assessments.length}`,
    pageWidth / 2, 160, { align: 'center' }
  )

  // Summary stats
  const good = assessments.filter(a => a.condition === 'Good').length
  const moderate = assessments.filter(a => a.condition === 'Moderate').length
  const bad = assessments.filter(a => a.condition === 'Bad').length
  const totalChickens = assessments.reduce(
    (sum, a) => sum + (parseInt(a.chickenCount) || 0), 0
  )

  doc.setFontSize(10)
  doc.setTextColor(34, 197, 94)
  doc.text(`Good: ${good}`, pageWidth / 2 - 40, 180, { align: 'center' })
  doc.setTextColor(245, 158, 11)
  doc.text(`Moderate: ${moderate}`, pageWidth / 2, 180, { align: 'center' })
  doc.setTextColor(239, 68, 68)
  doc.text(`Bad: ${bad}`, pageWidth / 2 + 40, 180, { align: 'center' })

  doc.setTextColor(148, 163, 184)
  doc.setFontSize(10)
  doc.text(
    `Total Chickens Assessed: ${totalChickens.toLocaleString()}`,
    pageWidth / 2, 195, { align: 'center' }
  )

  // Assessment Pages
  for (const assessment of assessments) {
    doc.addPage()
    y = 20

    // Header bar
    doc.setFillColor(26, 35, 50)
    doc.rect(0, 0, pageWidth, 35, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(assessment.assessorName || 'Assessment', 20, 15)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(148, 163, 184)
    doc.text(
      new Date(assessment.createdAt).toLocaleDateString(),
      20, 25
    )

    // Condition badge
    const condColor = {
      Good: [34, 197, 94],
      Moderate: [245, 158, 11],
      Bad: [239, 68, 68]
    }
    const color = condColor[assessment.condition] || [100, 100, 100]
    doc.setFillColor(...color)
    doc.roundedRect(pageWidth - 50, 8, 30, 12, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(
      assessment.condition || 'N/A',
      pageWidth - 35, 16,
      { align: 'center' }
    )

    y = 45

    // Details
    const details = [
      ['Address', assessment.address],
      ['GPS', `${assessment.latitude}, ${assessment.longitude}`],
      ['Chickens', parseInt(assessment.chickenCount || 0).toLocaleString()],
      ['Notes', assessment.notes || 'None']
    ]

    doc.setFontSize(10)
    details.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(80, 80, 80)
      doc.text(`${label}:`, 20, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(26, 35, 50)
      const lines = doc.splitTextToSize(value || 'N/A', pageWidth - 80)
      doc.text(lines, 70, y)
      y += lines.length * 7 + 3
    })

    // Photos
    if (assessment.photos && assessment.photos.length > 0) {
      y += 5
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(26, 35, 50)
      doc.text('Photos', 20, y)
      y += 8

      for (const photo of assessment.photos) {
        try {
          const imgData = await loadImageAsBase64(photo.cloudinaryUrl)
          if (imgData) {
            if (y > 220) { doc.addPage(); y = 20 }
            doc.addImage(imgData, 'JPEG', 20, y, 75, 55)
            y += 65
          }
        } catch {
          console.warn('Photo load failed')
        }
      }
    }
  }

  // Page numbers
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Page ${i} of ${pageCount} — Ceres Flood Assessment Report`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }

  doc.save(`madison-county-full-report-${new Date().toISOString().split('T')[0]}.pdf`)
}

// Helper to load image as base64
async function loadImageAsBase64(url) {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}