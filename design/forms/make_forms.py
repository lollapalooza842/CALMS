"""The four borrower forms on the Downloads page (frontend/trail/files/*.pdf).
Run: python3 design/forms/make_forms.py   (needs reportlab). Edit the text here, not the PDFs."""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
F = "/usr/share/fonts/truetype/dejavu/"   # DejaVu has the peso sign and the tick box
for n, f in [("Sans", "DejaVuSans.ttf"), ("Sans-Bold", "DejaVuSans-Bold.ttf"), ("Serif", "DejaVuSerif.ttf"), ("Mono", "DejaVuSansMono.ttf")]: pdfmetrics.registerFont(TTFont(n, F + f))
pdfmetrics.registerFontFamily("Sans", normal="Sans", bold="Sans-Bold", italic="Sans", boldItalic="Sans-Bold")

OUT = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "trail", "files")
INK, SOFT, ACC, RULE = colors.HexColor("#24130a"), colors.HexColor("#6e5446"), colors.HexColor("#c0562f"), colors.HexColor("#d9c8b4")
H1 = ParagraphStyle("h1", fontName="Serif", fontSize=26, leading=30, textColor=INK, spaceAfter=4)
KICK = ParagraphStyle("k", fontName="Mono", fontSize=8.5, leading=11, textColor=ACC, spaceAfter=2)
H2 = ParagraphStyle("h2", fontName="Sans-Bold", fontSize=11.5, leading=15, textColor=INK, spaceBefore=12, spaceAfter=4)
P = ParagraphStyle("p", fontName="Sans", fontSize=9.5, leading=14, textColor=INK, spaceAfter=5)
S = ParagraphStyle("s", parent=P, fontSize=8.5, leading=12, textColor=SOFT)
LI = ParagraphStyle("li", parent=P, leftIndent=14, bulletIndent=2, spaceAfter=3)

def page(c, d):
    c.saveState(); w, h = A4
    c.setFillColor(INK); c.rect(0, h - 16 * mm, w, 16 * mm, stroke=0, fill=1)
    c.setFillColor(colors.HexColor("#f6eedf")); c.setFont("Serif", 15); c.drawString(18 * mm, h - 10.5 * mm, "GR8 Lending")
    c.setFont("Mono", 8); c.drawRightString(w - 18 * mm, h - 10 * mm, d.title.upper())
    c.setFillColor(SOFT); c.setFont("Sans", 7.5)
    c.drawString(18 * mm, 10 * mm, "GR8 Lending Company · Malolos branch · Mon–Sat 8:00–5:00 · Prepared with CALMS")
    c.drawRightString(w - 18 * mm, 10 * mm, "Page %d" % d.page); c.restoreState()

def doc(name, title, story):
    d = SimpleDocTemplate(os.path.join(OUT, name), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=26 * mm, bottomMargin=20 * mm, title=title, author="GR8 Lending Company")
    d.build(story, onFirstPage=page, onLaterPages=page)

def lines(rows, widths=(55 * mm, 119 * mm)):
    t = Table([[Paragraph(a, S), ""] for a in rows], colWidths=widths, rowHeights=9.5 * mm)
    t.setStyle(TableStyle([("LINEBELOW", (1, 0), (1, -1), .6, INK), ("VALIGN", (0, 0), (-1, -1), "BOTTOM"), ("BOTTOMPADDING", (0, 0), (-1, -1), 2)]))
    return t

def sign(left, right):
    t = Table([["", "", ""], [Paragraph(left, S), "", Paragraph(right, S)]], colWidths=(78 * mm, 18 * mm, 78 * mm), rowHeights=(13 * mm, 7 * mm))
    t.setStyle(TableStyle([("LINEABOVE", (0, 1), (0, 1), .8, INK), ("LINEABOVE", (2, 1), (2, 1), .8, INK)]))
    return t

def box(text):
    t = Table([[Paragraph(text, P)]], colWidths=(174 * mm,))
    t.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), .8, RULE), ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fbf6ee")), ("LEFTPADDING", (0, 0), (-1, -1), 9), ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]))
    return t

def tick(items):
    return [Paragraph("☐&nbsp;&nbsp;" + x, LI) for x in items]

# 1. Application checklist
ID = "One government ID: PhilSys ID, TIN, SSS, driver's license or passport (the original, and a copy)."
story = [Paragraph("For borrowers", KICK), Paragraph("Application checklist", H1),
  Paragraph("The papers each loan asks for. Bring them to the branch, or attach clear photos when you apply online at the GR8 website. Your loan processor checks every one and tells you exactly what is missing; nothing moves to review until the list is complete.", P),
  box("<b>Every loan:</b> " + ID + " The signed <b>consent form</b> (on this website, or signed online when you apply).")]
for name, items, note in [
  ("Salary loan", ["Pay stubs for the last 3 months", "Certificate of employment (with your position, date hired and monthly pay)", "Proof of billing at your home address (electricity, water or internet, last 3 months)", "Bank statement (last 3 months)"], "Paid by salary deduction: your employer signs the Salary deduction authority, also on this website."),
  ("Personal loan", ["Proof of income (pay stubs, an ITR, or remittance or business records)", "Proof of billing at your home address (last 3 months)"], ""),
  ("SME loan", ["DTI or SEC registration of the business", "Financial statements (last 2 years, or the last 12 months of sales and expenses for a new business)", "Proof of the business address", "Mayor's or business permit (current year)", "Bank statements of the business (last 6 months)"], "Bring the owner's ID as well as the business papers.")]:
    story += [KeepTogether([Paragraph(name, H2)] + tick(items) + ([Paragraph(note, S)] if note else []))]
story += [Paragraph("Good to know", H2), Paragraph("You may have only one open application for each kind of loan at a time. Photos must show all four corners and be readable. Papers are seen only by the GR8 staff working on your loan, and every look is logged (Data Privacy Act of 2012).", P)]
doc("GR8-Application-Checklist.pdf", "Application checklist", story)

# 2. Consent form
story = [Paragraph("For borrowers · Required for every loan", KICK), Paragraph("Consent form", H1),
  Paragraph("By signing this form, I, the applicant named below, agree to the following, for my loan application with GR8 Lending Company:", P)]
for b, t in [("Checking my identity and papers.", "GR8 may verify my government ID and the papers I submit with the offices and companies that issued them."),
             ("A credit check.", "GR8 may obtain my credit report from the Credit Information Corporation (CIC) and accredited credit bureaus, and report my loan and payments to them, as the law allows."),
             ("Privacy.", "I have read GR8's privacy notice. GR8 will use my personal information only to process, service and collect my loan and to meet its legal duties, keep it safe, and share it only as described in that notice (Data Privacy Act of 2012, Republic Act No. 10173). I may ask to see or correct my information."),
             ("Truthfulness.", "Everything I have stated and submitted is true and complete. I understand that false statements are grounds to decline my application or to call my loan due.")]:
    story.append(Paragraph("<b>%s</b> %s" % (b, t), LI))
story += [Spacer(1, 6), Paragraph("Applicant", H2), lines(["Full name", "Date of birth", "Government ID and number", "Mobile number", "Home address", "Loan applied for"]),
  Spacer(1, 10), sign("Signature over printed name", "Date signed"),
  Spacer(1, 8), Paragraph("For GR8 use: received by ____________________ on ______________  ·  Application no. APP-________-________", S),
  Spacer(1, 6), Paragraph("Applying online? You sign this same consent on the screen, so there is no need to print this form.", S)]
doc("GR8-Consent-Form.pdf", "Consent form", story)

# 3. Salary deduction authority
story = [Paragraph("For salary loans", KICK), Paragraph("Salary deduction authority", H1),
  Paragraph("I authorize my employer to deduct my monthly loan amortization from my salary and to pay it to GR8 Lending Company, until my loan below is fully paid or GR8 tells my employer in writing to stop.", P),
  Paragraph("Employee", H2), lines(["Full name", "Employee number", "Position and department", "Mobile number"]),
  Paragraph("Loan", H2), lines(["GR8 application or loan account no.", "Monthly deduction (₱)", "Number of months", "First deduction (payroll date)"]),
  Spacer(1, 8), Paragraph("If my employment ends before the loan is paid, I will pay the remaining balance directly to GR8, and I allow my employer to deduct the amount due from my final pay, as the law allows.", P),
  KeepTogether(sign("Employee's signature over printed name", "Date")),
  Paragraph("Employer", H2), lines(["Company name", "Company address", "HR or payroll contact and number"]),
  Spacer(1, 6), Paragraph("We agree to make the deduction above on each payroll and to remit it to GR8 Lending Company within five working days, with the list of employees and amounts.", P),
  KeepTogether(sign("Authorized officer (signature, name, position)", "Date and company stamp"))]
doc("GR8-Salary-Deduction-Authority.pdf", "Salary deduction authority", story)

# 4. How to pay
story = [Paragraph("For borrowers", KICK), Paragraph("How to pay", H1),
  Paragraph("Pay any of these ways. Always use your <b>loan account number</b> (like LN-2026-0101, on your agreement and in My GR8) so the payment lands on the right loan. Every payment gets an official receipt, and you can see it in My GR8.", P)]
for title, steps in [
  ("Cash at the branch", ["Go to the Malolos branch, Monday to Saturday, 8:00 to 5:00.", "Give your loan account number to the cashier.", "Keep the official receipt."]),
  ("Bank deposit", ["Deposit to GR8 Lending Company's account: [bank, account name and number, to follow].", "Write your loan account number on the deposit slip.", "Tell us in My GR8 > Payments (amount, date and the deposit reference), or bring the slip to the branch."]),
  ("GCash", ["Send to GR8 Lending Company's GCash: [number, to follow].", "Put your loan account number in the message.", "Tell us in My GR8 > Payments with the GCash reference number."]),
  ("Salary deduction (salary loans)", ["Your employer deducts it each payroll and pays GR8 (Salary deduction authority).", "Check your payslip; it also shows in My GR8 once posted."]),
  ("Cheque", ["Make it payable to GR8 Lending Company.", "Write your loan account number and mobile number on the back.", "Bring it to the branch. It counts as paid when the cheque clears."])]:
    story.append(KeepTogether([Paragraph(title, H2)] + [Paragraph(s, LI, bulletText="•") for s in steps]))
story += [Paragraph("How a payment is applied", H2), box("To any penalty first, then interest, then principal, starting with the oldest amount due. You may pay early or pay more; your agreement explains how. Payments you tell us about online are checked and posted by GR8 staff, usually within one working day.")]
doc("GR8-How-to-Pay.pdf", "How to pay", story)
print("ok", sorted(os.listdir(OUT)))
