// Gemini API utility functions
const GEMINI_API_KEY = 'AIzaSyDLQHZjDE_HkjXZWEQD8C8uHKj5Yku-5rg';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export interface AIAnalysisResult {
  success: boolean;
  data?: string;
  error?: string;
}

export async function analyzeWithGemini(prompt: string): Promise<AIAnalysisResult> {
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data: GeminiResponse = await response.json();
    
    if (data.candidates && data.candidates.length > 0) {
      return {
        success: true,
        data: data.candidates[0].content.parts[0].text
      };
    } else {
      return {
        success: false,
        error: 'No response from AI model'
      };
    }
  } catch (error) {
    console.error('Gemini API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Specific AI functions for different features
export async function generateInvoiceContent(saleData: any): Promise<AIAnalysisResult> {
  const prompt = `
    Aşağıdaki satış verilerine göre profesyonel bir fatura içeriği oluştur:
    
    Müşteri: ${saleData.customerName}
    Tutar: ${saleData.amount} TL
    Tarih: ${saleData.date}
    Açıklama: ${saleData.description}
    
    Fatura içeriğini Türkçe olarak, profesyonel bir dille oluştur.
  `;
  
  return await analyzeWithGemini(prompt);
}

export async function analyzeStockLevels(stockData: any[]): Promise<AIAnalysisResult> {
  const prompt = `
    Aşağıdaki stok verilerini analiz et ve kritik seviyedeki ürünler için uyarı mesajları oluştur:
    
    ${stockData.map(item => `Ürün: ${item.name}, Stok: ${item.quantity}, Minimum: ${item.minLevel}`).join('\n')}
    
    Kritik seviyedeki ürünler için uyarı mesajları oluştur ve öneriler sun.
  `;
  
  return await analyzeWithGemini(prompt);
}

export async function generateCustomerReminder(customerData: any): Promise<AIAnalysisResult> {
  const prompt = `
    Aşağıdaki müşteri için nazik bir hatırlatma mesajı oluştur:
    
    Müşteri: ${customerData.name}
    Son Satın Alma: ${customerData.lastPurchase}
    Toplam Harcama: ${customerData.totalSpent} TL
    
    Müşteriyi yeni ürünlerimiz hakkında bilgilendiren, nazik bir mesaj oluştur.
  `;
  
  return await analyzeWithGemini(prompt);
}

export async function generateReportSummary(reportData: any): Promise<AIAnalysisResult> {
  const prompt = `
    Aşağıdaki rapor verilerini analiz et ve özet çıkar:
    
    ${JSON.stringify(reportData, null, 2)}
    
    Bu verileri analiz ederek işletme için önemli bulguları ve önerileri Türkçe olarak sun.
  `;
  
  return await analyzeWithGemini(prompt);
}

export async function predictChurn(customerBehavior: any): Promise<AIAnalysisResult> {
  const prompt = `
    Aşağıdaki müşteri davranış verilerine göre churn (müşteri kaybı) olasılığını analiz et:
    
    Müşteri: ${customerBehavior.name}
    Son Aktivite: ${customerBehavior.lastActivity}
    Satın Alma Sıklığı: ${customerBehavior.purchaseFrequency}
    Toplam Harcama: ${customerBehavior.totalSpent}
    Şikayet Sayısı: ${customerBehavior.complaints || 0}
    
    Bu müşterinin kaybetme riskini değerlendir ve risk seviyesini belirt (Düşük/Orta/Yüksek).
  `;
  
  return await analyzeWithGemini(prompt);
}

export async function analyzeProductRelationships(salesData: any[]): Promise<AIAnalysisResult> {
  const prompt = `
    Aşağıdaki satış verilerini analiz ederek ürün ilişkilerini bul:
    
    ${salesData.map(sale => `Satış: ${sale.products.join(', ')} - Tarih: ${sale.date}`).join('\n')}
    
    Hangi ürünlerin birlikte satıldığını analiz et ve öneriler sun.
  `;
  
  return await analyzeWithGemini(prompt);
} 