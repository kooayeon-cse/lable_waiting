import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, phone, people } = req.body;

  if (!name || !phone || !people) {
    return res.status(400).json({ error: '필수 파라미터 누락' });
  }

  const accessKey = process.env.NCP_ACCESS_KEY;
  const secretKey = process.env.NCP_SECRET_KEY;
  const serviceId = process.env.NCP_SERVICE_ID;

  const timestamp = Date.now().toString();
  const method = 'POST';
  const url = `/alimtalk/v2/services/${serviceId}/messages`;

  const message = `${method} ${url}\n${timestamp}\n${accessKey}`;
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('base64');

  const body = {
    plusFriendId: '@레이블',
    templateCode: 'Lable',
    messages: [
      {
        to: phone.replace(/-/g, ''),
        templateParameters: {
          이름: name,
          인원: String(people),
        },
      },
    ],
  };

  try {
    const response = await fetch(
      `https://sens.apigw.ntruss.com/alimtalk/v2/services/${serviceId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ncp-apigw-timestamp': timestamp,
          'x-ncp-iam-access-key': accessKey,
          'x-ncp-apigw-signature-v2': signature,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('알림톡 발송 실패:', data);
      return res.status(500).json({ error: '알림톡 발송 실패', detail: data });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('서버 오류:', err);
    return res.status(500).json({ error: '서버 오류' });
  }
}
