declare module "nodemailer" {
  export type Transporter = {
    sendMail(options: {
      from: string;
      html: string;
      subject: string;
      text: string;
      to: string;
    }): Promise<unknown>;
  };

  const nodemailer: {
    createTransport(options: {
      auth?: {
        pass: string;
        user: string;
      };
      host: string;
      port: number;
      secure: boolean;
    }): Transporter;
  };

  export default nodemailer;
}
