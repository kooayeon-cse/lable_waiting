import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, phone, people, key } = req.body;

  if (!name || !phone || !people || !key) {
    return res.status(400).json({ error: '필수 파라미터 누락' });
  }

  const accessKey = process.env.NCP_ACCESS_KEY;
  const secretKey = process.env.NCP_SECRET_KEY;
  const serviceId = process.env.NCP_SERVICE_ID;
  const baseUrl = 'https://lable-waiting.vercel.app';

  const timestamp = Date.now().toString();
  const method = 'POST';
  const url = `/alimtalk/v2/services/${serviceId}/messages`;

  const message = `${method} ${url}\n${timestamp}\n${accessKey}`;
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('base64');

  const content = `안녕하세요, ${name}님! 😊 레이블입니다. \\n\n요청하신 ${people}명 자리가 준비되었습니다!\\n방문해주시면 순서대로 안내해드리겠습니다!\\n※ 입장 안내 메시지 발송 시각을 기준으로 10분 이상 방문이 지연될 경우, \\n다음 대기팀에게 자리가 안내될 수 있습니다. \\n문의사항은 매장으로 전화 부탁드립니다.\\n\n010-5501-1483\\n감사합니다💙`;

  const body = {
    plusFriendId: '@레이블',
    templateCode: 'Lable',
    messages: [
      {
        to: phone.replace(/-/g, ''),
        content,
        templateParameters: {
          이름: name,
          인원: String(people),
        },
        buttons: [
          {
            type: 'WL',
            name: '건너뛰기',
            linkMobile: `${baseUrl}?action=skip&key=${key}`,
            linkPc: `${baseUrl}?action=skip&key=${key}`,
          },
          {
            type: 'WL',
            name: '대기 취소',
            linkMobile: `${baseUrl}?action=cancel&key=${key}`,
            linkPc: `${baseUrl}?action=cancel&key=${key}`,
          },
        ],
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
