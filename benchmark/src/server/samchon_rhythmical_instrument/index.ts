import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import node from "@elysiajs/node";

interface MusicalInstrument {
  name: string;
  description: string;
  price: number;
}

interface RefundRequest {
  id: string;
  customer_name: string;
  instrument_name: string;
  reason: string;
  status: RefundStatus;
  created_at: string;
}

enum RefundStatus {
  Pending = "Pending",
  Approved = "Approved",
  Rejected = "Rejected",
}

interface CustomerInquiry {
  id: string;
  customer_name: string;
  subject: string;
  message: string;
  status: InquiryStatus;
  created_at: string;
}

enum InquiryStatus {
  Open = "Open",
  InProgress = "InProgress",
  Resolved = "Resolved",
}

interface RepairRequest {
  id: string;
  customer_name: string;
  instrument_name: string;
  issue_description: string;
  status: RepairStatus;
  estimated_cost?: number;
  created_at: string;
}

enum RepairStatus {
  Received = "Received",
  Diagnosing = "Diagnosing",
  RepairInProgress = "RepairInProgress",
  Ready = "Ready",
  Completed = "Completed",
}

interface ExchangeRequest {
  id: string;
  customer_name: string;
  original_instrument_name: string;
  desired_instrument_name: string;
  reason: string;
  status: ExchangeStatus;
  created_at: string;
}

enum ExchangeStatus {
  Pending = "Pending",
  Approved = "Approved",
  Rejected = "Rejected",
  Completed = "Completed",
}

interface PurchaseHistory {
  id: string;
  member_id: string;
  instrument_name: string;
  price: number;
  purchase_date: string;
  status: PurchaseStatus;
}

enum PurchaseStatus {
  Completed = "Completed",
  Cancelled = "Cancelled",
  Refunded = "Refunded",
}

interface MusicalInstrument {
  name: string;
  description: string;
  price: number;
}

interface PurchaseHistory {
  id: string;
  member_id: string;
  instrument_name: string;
  price: number;
  purchase_date: string;
  status: PurchaseStatus;
}

export const MusicalInstrumentList: MusicalInstrument[] = [
  {
    name: "Guitar",
    description: "A guitar is a stringed musical instrument",
    price: 100.0,
  },
  {
    name: "Piano",
    description: "A piano is a keyboard musical instrument",
    price: 200.0,
  },
  {
    name: "Drums",
    description: "A drums is a percussion musical instrument",
    price: 300.0,
  },
  {
    name: "Violin",
    description: "A violin is a stringed musical instrument",
    price: 400.0,
  },
  {
    name: "Bass",
    description: "A bass is a stringed musical instrument",
    price: 500.0,
  },
  {
    name: "Saxophone",
    description: "A saxophone is a brass musical instrument",
    price: 600.0,
  },
  {
    name: "Flute",
    description: "A flute is a woodwind musical instrument",
    price: 700.0,
  },
  {
    name: "Clarinet",
    description: "A clarinet is a woodwind musical instrument",
    price: 800.0,
  },
  {
    name: "Oboe",
    description: "An oboe is a woodwind musical instrument",
    price: 900.0,
  },
  {
    name: "Trombone",
    description: "A trombone is a brass musical instrument",
    price: 1000.0,
  },
  {
    name: "Tuba",
    description: "A tuba is a brass musical instrument",
    price: 1100.0,
  },
  {
    name: "Cello",
    description: "A cello is a stringed musical instrument",
    price: 1200.0,
  },
  {
    name: "Harp",
    description: "A harp is a stringed musical instrument",
    price: 1300.0,
  },
  {
    name: "Bassoon",
    description: "A bassoon is a woodwind musical instrument",
    price: 1400.0,
  },
  {
    name: "Piccolo",
    description: "A piccolo is a woodwind musical instrument",
    price: 1500.0,
  },
  {
    name: "Xylophone",
    description: "A xylophone is a percussion musical instrument",
    price: 1600.0,
  },
];

export const refundRequests: Map<string, RefundRequest> = new Map();
export const customerInquiries: Map<string, CustomerInquiry> = new Map();
export const repairRequests: Map<string, RepairRequest> = new Map();
export const exchangeRequests: Map<string, ExchangeRequest> = new Map();

const samplePurchases: PurchaseHistory[] = [
  {
    id: "PH001",
    member_id: "20250114",
    instrument_name: "Gibson Les Paul Standard",
    price: 2802.16,
    purchase_date: "2024-01-07",
    status: PurchaseStatus.Completed,
  },
  {
    id: "PH002",
    member_id: "20250114",
    instrument_name: "Piano",
    price: 1299.99,
    purchase_date: "2024-01-10",
    status: PurchaseStatus.Completed,
  },
  {
    id: "PH003",
    member_id: "20250114",
    instrument_name: "Violin",
    price: 799.99,
    purchase_date: "2023-12-25",
    status: PurchaseStatus.Refunded,
  },
  {
    id: "PH004",
    member_id: "20250114",
    instrument_name: "Drums",
    price: 899.99,
    purchase_date: "2023-12-20",
    status: PurchaseStatus.Completed,
  },
  {
    id: "PH005",
    member_id: "20250114",
    instrument_name: "Saxophone",
    price: 1099.99,
    purchase_date: "2023-11-30",
    status: PurchaseStatus.Completed,
  },
  {
    id: "PH006",
    member_id: "20250114",
    instrument_name: "Flute",
    price: 499.99,
    purchase_date: "2023-11-15",
    status: PurchaseStatus.Cancelled,
  },
  {
    id: "PH007",
    member_id: "20250114",
    instrument_name: "Clarinet",
    price: 699.99,
    purchase_date: "2023-10-30",
    status: PurchaseStatus.Completed,
  },
  {
    id: "PH008",
    member_id: "20250114",
    instrument_name: "Trombone",
    price: 899.99,
    purchase_date: "2023-10-15",
    status: PurchaseStatus.Completed,
  },
  {
    id: "PH009",
    member_id: "20250114",
    instrument_name: "Cello",
    price: 1499.99,
    purchase_date: "2023-09-30",
    status: PurchaseStatus.Completed,
  },
  {
    id: "PH010",
    member_id: "20250114",
    instrument_name: "Harp",
    price: 2999.99,
    purchase_date: "2023-09-15",
    status: PurchaseStatus.Completed,
  },
];

export const purchaseHistories: Map<string, PurchaseHistory> = new Map(
  samplePurchases.map((purchase) => [purchase.id, purchase])
);

const app = new Elysia({
  prefix: "/musical",
  adapter: node(),
})
  .use(
    swagger({
      documentation: {
        servers: [{ url: "http://localhost:3000" }],
        info: {
          title: "악기 상점 API",
          version: "1.0.0",
          description: "악기 상점의 구매, 환불, 교환, 수리, 문의 관련 API",
        },
        tags: [
          { name: "구매", description: "구매 관련 API" },
          { name: "환불", description: "환불 관련 API" },
          { name: "문의", description: "고객 문의 관련 API" },
          { name: "수리", description: "수리 요청 관련 API" },
          { name: "교환", description: "교환 요청 관련 API" },
        ],
      },
    })
  )
  .get(
    "/purchases",
    {
      detail: {
        tags: ["구매"],
        description: "모든 구매 내역 조회",
        responses: {
          200: {
            description: "구매 내역 목록",
          },
        },
      },
    },
    () => Array.from(purchaseHistories.values())
  )
  .get(
    "/purchases/:id",
    {
      detail: {
        tags: ["구매"],
        description: "특정 구매 내역 조회",
        params: {
          id: { type: "string", description: "구매 ID" },
        },
        responses: {
          200: {
            description: "구매 내역 정보",
          },
        },
      },
    },
    ({ params: { id } }: { params: { id: string } }) =>
      purchaseHistories.get(id)
  )
  .post(
    "/purchases",
    {
      detail: {
        tags: ["구매"],
        description: "새로운 구매 생성",
        body: {
          type: "object",
          properties: {
            id: { type: "string" },
            member_id: { type: "string" },
            instrument_name: { type: "string" },
            price: { type: "number" },
            purchase_date: { type: "string" },
            status: { type: "string", enum: Object.values(PurchaseStatus) },
          },
          required: [
            "id",
            "member_id",
            "instrument_name",
            "price",
            "purchase_date",
            "status",
          ],
        },
        responses: {
          200: {
            description: "생성된 구매 내역",
          },
        },
      },
    },
    ({ body }: { body: PurchaseHistory }) => {
      const purchase = body as PurchaseHistory;
      purchaseHistories.set(purchase.id, purchase);
      return purchase;
    }
  )
  .put(
    "/purchases/:id/status",
    {
      detail: {
        tags: ["구매"],
        description: "구매 상태 업데이트",
        params: {
          id: { type: "string", description: "구매 ID" },
        },
        body: {
          type: "object",
          properties: {
            status: { type: "string", enum: Object.values(PurchaseStatus) },
          },
          required: ["status"],
        },
        responses: {
          200: {
            description: "업데이트된 구매 내역",
          },
        },
      },
    },
    ({
      params: { id },
      body,
    }: {
      params: { id: string };
      body: { status: PurchaseStatus };
    }) => {
      const purchase = purchaseHistories.get(id);
      if (!purchase) return null;

      const { status } = body as { status: PurchaseStatus };
      purchase.status = status;
      purchaseHistories.set(id, purchase);

      return purchase;
    }
  )
  .delete(
    "/purchases/:id",
    {
      detail: {
        tags: ["구매"],
        description: "구매 내역 삭제",
        params: {
          id: { type: "string", description: "구매 ID" },
        },
        responses: {
          200: {
            description: "삭제된 구매 내역",
          },
        },
      },
    },
    ({ params: { id } }: { params: { id: string } }) => {
      const purchase = purchaseHistories.get(id);
      if (!purchase) return null;

      purchaseHistories.delete(id);
      return purchase;
    }
  )
  .get(
    "/members/:memberId/purchases",
    {
      detail: {
        tags: ["구매"],
        description: "회원별 구매 내역 조회",
        params: {
          memberId: { type: "string", description: "회원 ID" },
        },
        responses: {
          200: {
            description: "회원의 구매 내역 목록",
          },
        },
      },
    },
    ({ params: { memberId } }: { params: { memberId: string } }) => {
      return Array.from(purchaseHistories.values()).filter(
        (purchase) => purchase.member_id === memberId
      );
    }
  )
  .get(
    "/instruments/:name/purchases",
    {
      detail: {
        tags: ["구매"],
        description: "악기별 구매 내역 조회",
        params: {
          name: { type: "string", description: "악기 이름" },
        },
        responses: {
          200: {
            description: "악기의 구매 내역 목록",
          },
        },
      },
    },
    ({ params: { name } }: { params: { name: string } }) => {
      return Array.from(purchaseHistories.values()).filter(
        (purchase) => purchase.instrument_name === name
      );
    }
  )
  .get(
    "/instruments",
    {
      detail: {
        tags: ["구매"],
        description: "악기 목록 조회",
        responses: {
          200: {
            description: "악기 목록",
          },
        },
      },
    },
    () => MusicalInstrumentList
  )
  .get(
    "/refunds",
    {
      detail: {
        tags: ["환불"],
        description: "환불 요청 목록 조회",
        responses: {
          200: {
            description: "환불 요청 목록",
          },
        },
      },
    },
    () => Array.from(refundRequests.values())
  )
  .post(
    "/refund",
    {
      detail: {
        tags: ["환불"],
        description: "환불 요청 생성",
        body: {
          type: "object",
          properties: {
            id: { type: "string" },
            customer_name: { type: "string" },
            instrument_name: { type: "string" },
            reason: { type: "string" },
            status: { type: "string", enum: Object.values(RefundStatus) },
            created_at: { type: "string" },
          },
          required: [
            "id",
            "customer_name",
            "instrument_name",
            "reason",
            "status",
            "created_at",
          ],
        },
        responses: {
          200: {
            description: "생성된 환불 요청",
          },
        },
      },
    },
    ({ body }: { body: RefundRequest }) => {
      const request = body as RefundRequest;
      refundRequests.set(request.id, request);
      return request;
    }
  )
  .get(
    "/refund/:id",
    {
      detail: {
        tags: ["환불"],
        description: "특정 환불 요청 조회",
        params: {
          id: { type: "string", description: "환불 요청 ID" },
        },
        responses: {
          200: {
            description: "환불 요청 정보",
          },
        },
      },
    },
    ({ params: { id } }: { params: { id: string } }) => refundRequests.get(id)
  )
  .get(
    "/inquiries",
    {
      detail: {
        tags: ["문의"],
        description: "문의 목록 조회",
        responses: {
          200: {
            description: "문의 목록",
          },
        },
      },
    },
    () => Array.from(customerInquiries.values())
  )
  .get(
    "/repairs",
    {
      detail: {
        tags: ["수리"],
        description: "수리 요청 목록 조회",
        responses: {
          200: {
            description: "수리 요청 목록",
          },
        },
      },
    },
    () => Array.from(repairRequests.values())
  )
  .post(
    "/inquiry",
    {
      detail: {
        tags: ["문의"],
        description: "문의 생성",
        body: {
          type: "object",
          properties: {
            id: { type: "string" },
            customer_name: { type: "string" },
            subject: { type: "string" },
            message: { type: "string" },
            status: { type: "string", enum: Object.values(InquiryStatus) },
            created_at: { type: "string" },
          },
          required: [
            "id",
            "customer_name",
            "subject",
            "message",
            "status",
            "created_at",
          ],
        },
        responses: {
          200: {
            description: "생성된 문의",
          },
        },
      },
    },
    ({ body }: { body: CustomerInquiry }) => {
      const inquiry = body as CustomerInquiry;
      customerInquiries.set(inquiry.id, inquiry);
      return inquiry;
    }
  )
  .get(
    "/inquiry/:id",
    {
      detail: {
        tags: ["문의"],
        description: "특정 문의 조회",
        params: {
          id: { type: "string", description: "문의 ID" },
        },
        responses: {
          200: {
            description: "문의 정보",
          },
        },
      },
    },
    ({ params: { id } }: { params: { id: string } }) =>
      customerInquiries.get(id)
  )
  .post(
    "/repair",
    {
      detail: {
        tags: ["수리"],
        description: "수리 요청 생성",
        body: {
          type: "object",
          properties: {
            id: { type: "string" },
            customer_name: { type: "string" },
            instrument_name: { type: "string" },
            issue_description: { type: "string" },
            status: { type: "string", enum: Object.values(RepairStatus) },
            estimated_cost: { type: "number" },
            created_at: { type: "string" },
          },
          required: [
            "id",
            "customer_name",
            "instrument_name",
            "issue_description",
            "status",
            "created_at",
          ],
        },
        responses: {
          200: {
            description: "생성된 수리 요청",
          },
        },
      },
    },
    ({ body }: { body: RepairRequest }) => {
      const request = body as RepairRequest;
      repairRequests.set(request.id, request);
      return request;
    }
  )
  .get(
    "/repair/:id",
    {
      detail: {
        tags: ["수리"],
        description: "특정 수리 요청 조회",
        params: {
          id: { type: "string", description: "수리 요청 ID" },
        },
        responses: {
          200: {
            description: "수리 요청 정보",
          },
        },
      },
    },
    ({ params: { id } }: { params: { id: string } }) => repairRequests.get(id)
  )
  .get(
    "/exchanges",
    {
      detail: {
        tags: ["교환"],
        description: "교환 요청 목록 조회",
        responses: {
          200: {
            description: "교환 요청 목록",
          },
        },
      },
    },
    () => Array.from(exchangeRequests.values())
  )
  .post(
    "/exchange",
    {
      detail: {
        tags: ["교환"],
        description: "교환 요청 생성",
        body: {
          type: "object",
          properties: {
            id: { type: "string" },
            customer_name: { type: "string" },
            original_instrument_name: { type: "string" },
            desired_instrument_name: { type: "string" },
            reason: { type: "string" },
            status: { type: "string", enum: Object.values(ExchangeStatus) },
            created_at: { type: "string" },
          },
          required: [
            "id",
            "customer_name",
            "original_instrument_name",
            "desired_instrument_name",
            "reason",
            "status",
            "created_at",
          ],
        },
        responses: {
          200: {
            description: "생성된 교환 요청",
          },
        },
      },
    },
    ({ body }: { body: ExchangeRequest }) => {
      const request = body as ExchangeRequest;
      exchangeRequests.set(request.id, request);
      return request;
    }
  )
  .get(
    "/exchange/:id",
    {
      detail: {
        tags: ["교환"],
        description: "특정 교환 요청 조회",
        params: {
          id: { type: "string", description: "교환 요청 ID" },
        },
        responses: {
          200: {
            description: "교환 요청 정보",
          },
        },
      },
    },
    ({ params: { id } }: { params: { id: string } }) => exchangeRequests.get(id)
  );

export { app };
